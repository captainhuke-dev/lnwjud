import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DeviceRegistry } from './channels/device-registry.js';
import { registerDeviceChannel, HEARTBEAT_INTERVAL_MS } from './channels/device-channel.js';
import { CatalogService } from './catalog/catalog-service.js';
import { RequestJournal } from './journal/request-journal.js';
import type { SqliteDatabase } from '@lnwjud/storage';

const PORT = Number.parseInt(process.env.RELAY_PORT ?? '10100', 10);
const HOST = process.env.RELAY_HOST ?? '0.0.0.0';
/** Grace window: hold an AI request while the device reconnects (doc §13). */
const DEVICE_GRACE_MS = Number.parseInt(process.env.RELAY_DEVICE_GRACE_MS ?? '30_000', 10);
/** Per-request forwarding timeout once dispatched to a device. */
const DEVICE_TIMEOUT_MS = Number.parseInt(process.env.RELAY_DEVICE_TIMEOUT_MS ?? '300_000', 10);

export interface RelayContext {
  registry: DeviceRegistry;
  catalog: CatalogService;
  journal: RequestJournal;
}

export async function buildRelayServer(db?: SqliteDatabase): Promise<{ app: ReturnType<typeof Fastify>; context: RelayContext }> {
  const app = Fastify({ logger: false });
  const registry = new DeviceRegistry();
  let catalog: CatalogService;
  let journal: RequestJournal | null = null;

  if (db !== undefined) {
    catalog = new CatalogService(db);
    journal = new RequestJournal(db);
  }

  app.get('/healthz', async () => ({ status: 'live' }));
  app.get('/readyz', async () => ({ status: 'ready' }));
  app.get('/devices', async () => ({ devices: registry.snapshot() }));

  registerDeviceChannel(app, registry);

  // Public MCP endpoint — stable per-profile URL (Phase 1 Task 1.4 + 1.5 + 1.6).
  app.post('/p/:profileId/mcp', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    const body = (request.body ?? {}) as Record<string, unknown>;
    const method = typeof body.method === 'string' ? body.method : '';
    const aiId = body.id ?? null;

    // Idempotency key: AI-supplied or relay-generated.
    const meta = (body.params as { _meta?: Record<string, unknown> } | undefined)?._meta;
    const requestId = typeof meta?.request_id === 'string'
      ? (meta.request_id)
      : `relay-${randomUUID()}`;

    // Task 1.5 — replay short-circuit: a committed result never re-dispatches.
    if (journal !== null) {
      const prior = journal.claim(requestId, profileId);
      if (prior !== null && journal.hasCommittedResult(requestId)) {
        const payload = prior.resultPayload !== null ? JSON.parse(prior.resultPayload) : {};
        journal.markDelivered(requestId);
        return reply.code(200).send({ ...(payload as object), replayed: true });
      }
      journal.markStarted(requestId);
    }

    // Task 1.6 — serve tools/list from the cached catalog when possible.
    const isToolsList = method === 'tools/list';
    const catalogAvailable = catalog !== undefined && catalog.canServeOffline(profileId);

    if (!registry.isOnline(profileId)) {
      // Grace: hold briefly in case the device is mid-reconnect.
      const deadline = Date.now() + DEVICE_GRACE_MS;
      while (Date.now() < deadline && !registry.isOnline(profileId)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      // Offline but we have a cached catalog → serve tools/list from the relay
      // so the AI-side schema cache stays valid even while the device is down.
      if (!registry.isOnline(profileId)) {
        if (isToolsList && catalogAvailable && catalog !== undefined) {
          const snapshot = catalog.get(profileId)!;
          return reply.code(200).send({
            jsonrpc: '2.0',
            id: aiId,
            result: {
              tools: snapshot.tools,
              catalog_version: snapshot.version,
              served_from_cache: true,
            },
          });
        }
        return reply.code(503).send({
          jsonrpc: '2.0',
          id: aiId,
          error: { code: -32000, message: 'DEVICE_OFFLINE', data: { retryable: true } },
        });
      }
    }

    try {
      const response = await registry.forward<Record<string, unknown>>(
        profileId,
        requestId,
        { ...body, jsonrpc: '2.0' },
        DEVICE_TIMEOUT_MS,
      );
      journal?.commitResult(requestId, JSON.stringify(response));
      return reply.code(200).send(response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'relay failure';
      // DEVICE_OFFLINE after dispatch attempt: fall back to the cached catalog
      // for tools/list before giving up.
      if (message === 'DEVICE_OFFLINE' && isToolsList && catalog !== undefined && catalog.canServeOffline(profileId)) {
        const snapshot = catalog.get(profileId)!;
        return reply.code(200).send({
          jsonrpc: '2.0',
          id: aiId,
          result: { tools: snapshot.tools, catalog_version: snapshot.version, served_from_cache: true },
        });
      }
      return reply.code(message === 'DEVICE_OFFLINE' ? 503 : 502).send({
        jsonrpc: '2.0',
        id: aiId,
        error: { code: -32000, message, data: { retryable: message !== 'DEVICE_TIMEOUT' } },
      });
    }
  });

  // Device HELLO also publishes/refreshes the tool catalog (Task 1.6).
  app.addHook('onListen', async () => {
    process.stderr.write(`lnwjud relay ready on ${HOST}:${PORT} (heartbeat ${HEARTBEAT_INTERVAL_MS}ms)\n`);
  });

  function setCatalog(catalogService: CatalogService): void {
    catalog = catalogService;
  }
  void setCatalog;

  return { app, context: { registry, ...(catalog !== undefined ? { catalog } : {}), ...(journal !== null ? { journal } : {}) } as unknown as RelayContext };
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
