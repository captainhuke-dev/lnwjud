import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number.parseInt(process.env.RELAY_PORT ?? '10100', 10);
const HOST = process.env.RELAY_HOST ?? '0.0.0.0';

export async function buildRelayServer(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: false });

  app.get('/healthz', async () => ({ status: 'live' }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  return app;
}

export async function startRelay(): Promise<void> {
  const app = await buildRelayServer();
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
