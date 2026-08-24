import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DeviceRegistry } from './channels/device-registry.js';
import { registerDeviceChannel } from './channels/device-channel.js';

const PORT = Number.parseInt(process.env.RELAY_PORT ?? '10100', 10);
const HOST = process.env.RELAY_HOST ?? '0.0.0.0';
/** Grace window: hold an AI request while the device reconnects (doc §13). */
const DEVICE_GRACE_MS = Number.parseInt(process.env.RELAY_DEVICE_GRACE_MS ?? '30_000', 10);
/** Per-request forwarding timeout once dispatched to a device. */
const DEVICE_TIMEOUT_MS = Number.parseInt(process.env.RELAY_DEVICE_TIMEOUT_MS ?? '300_000', 10);

export interface RelayContext {
  registry: DeviceRegistry;
}

export async function buildRelayServer(): Promise<{ app: ReturnType<typeof Fastify>; context: RelayContext }> {
  const app = Fastify({ logger: false });
  const registry = new DeviceRegistry();

  app.get('/healthz', async () => ({ status: 'live' }));
  app.get('/readyz', async () => ({ status: 'ready' }));
  app.get('/devices', async () => ({ devices: registry.snapshot() }));

  registerDeviceChannel(app, registry);

  // Public MCP endpoint — stable per-profile URL (Phase 1 Task 1.4 skeleton).
  app.post('/p/:profileId/mcp', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    if (!registry.isOnline(profileId)) {
      // Grace: hold briefly in case the device is mid-reconnect.
      const deadline = Date.now() + DEVICE_GRACE_MS;
      while (Date.now() < deadline && !registry.isOnline(profileId)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    if (!registry.isOnline(profileId)) {
      return reply.code(503).send({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message: 'DEVICE_OFFLINE',
          data: { retryable: true },
        },
      });
    }
    try {
      const requestId = randomRequestId();
      const response = await registry.forward(
        profileId,
        requestId,
        { ...(request.body as object), jsonrpc: '2.0' },
        DEVICE_TIMEOUT_MS,
      );
      return reply.code(200).send(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'relay failure';
      return reply.code(message === 'DEVICE_OFFLINE' ? 503 : 502).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32000, message, data: { retryable: message !== 'DEVICE_TIMEOUT' } },
      });
    }
  });

  function randomRequestId(): string {
    return crypto.randomUUID();
  }

  return { app, context: { registry } };
}

export async function startRelay(): Promise<void> {
  const { app } = await buildRelayServer();
  await app.listen({ port: PORT, host: HOST });
  process.stderr.write(`lnwjud relay listening on ${HOST}:${PORT}\n`);
}

const isDirectRun = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  startRelay().catch((error: unknown) => {
    process.stderr.write(`lnwjud relay failed: ${error instanceof Error ? error.message : 'unknown'}\n`);
    process.exit(1);
  });
}
