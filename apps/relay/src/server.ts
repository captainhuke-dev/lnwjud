import Fastify from 'fastify';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { DeviceRegistry } from './channels/device-registry.js';
import { registerDeviceChannel, HEARTBEAT_INTERVAL_MS } from './channels/device-channel.js';
import { CatalogService } from './catalog/catalog-service.js';
import { RequestJournal } from './journal/request-journal.js';
import { OAuthService } from './oauth/oauth-service.js';
import { detectProtocolVersion, LegacySessionFacade, validateForEra } from './gateway/protocol-facade.js';
import type { SqliteDatabase } from '@lnwjud/storage';

const PORT = Number.parseInt(process.env.RELAY_PORT ?? '10100', 10);
const HOST = process.env.RELAY_HOST ?? '0.0.0.0';
/** Grace window: hold an AI request while the device reconnects (doc §13). */
const DEVICE_GRACE_MS = Number.parseInt(process.env.RELAY_DEVICE_GRACE_MS ?? '30_000', 10);
/** Per-request forwarding timeout once dispatched to a device. */
const DEVICE_TIMEOUT_MS = Number.parseInt(process.env.RELAY_DEVICE_TIMEOUT_MS ?? '300_000', 10);

export interface RelayContext {
  registry: DeviceRegistry;
  catalog: CatalogService | undefined;
  journal: RequestJournal | null;
  oauth: OAuthService | null;
  legacySessions: LegacySessionFacade;
}

export async function buildRelayServer(db?: SqliteDatabase): Promise<{ app: ReturnType<typeof Fastify>; context: RelayContext }> {
  const app = Fastify({ logger: false });
  const registry = new DeviceRegistry();
  let catalog: CatalogService | undefined;
  let journal: RequestJournal | null = null;
  let oauth: OAuthService | null = null;
  const legacySessions = new LegacySessionFacade();

  if (db !== undefined) {
    catalog = new CatalogService(db);
    journal = new RequestJournal(db);
    oauth = new OAuthService(db);
  }

  // Task 1.7 — OAuth PKCE endpoints. Enabled only when a database is attached
  // (the pure in-memory test path has no token store).
  if (oauth !== null) {
    app.get('/oauth/authorize', async (request, reply) => {
      const query = request.query as Record<string, string | undefined>;
      try {
        const grant = oauth!.beginAuthorization(
          query.client_id ?? '',
          query.redirect_uri ?? '',
          query.code_challenge ?? '',
          query.scope ?? 'mcp',
        );
        const redirect = new URL(query.redirect_uri!);
        redirect.searchParams.set('code', grant.authorizationCode);
        redirect.searchParams.set('state', query.state ?? '');
        return reply.redirect(302, redirect.toString());
      } catch (error: unknown) {
        return reply.code(400).send({
          error: 'invalid_request',
          description: error instanceof Error ? error.message : 'invalid authorization request',
        });
      }
    });

    app.post('/oauth/token', async (request, reply) => {
      const body = (request.body ?? {}) as Record<string, string>;
      if (body.grant_type !== 'authorization_code') {
        return reply.code(400).send({ error: 'unsupported_grant_type' });
      }
      const token = oauth!.exchangeCode({
        code: body.code ?? '',
        clientId: body.client_id ?? '',
        redirectUri: body.redirect_uri ?? '',
        codeVerifier: body.code_verifier ?? '',
      });
      if (token === null) {
        return reply.code(400).send({ error: 'invalid_grant', description: 'code expired, consumed, or verifier mismatch' });
      }
      return reply.code(200).send({
        access_token: token.accessToken,
        token_type: token.tokenType,
        expires_in: token.expiresIn,
      });
    });
  }

  // Task 1.7 — Bearer guard on the public MCP endpoint.
  const requireToken = oauth !== null;

  app.get('/healthz', async () => ({ status: 'live' }));
  app.get('/readyz', async () => ({ status: 'ready' }));
  app.get('/devices', async () => ({ devices: registry.snapshot() }));

  registerDeviceChannel(app, registry);

  // Public MCP endpoint — stable per-profile URL (Phase 1 Task 1.4 + 1.5 + 1.6 + 1.7).
  app.post('/p/:profileId/mcp', async (request, reply) => {
    const { profileId } = request.params as { profileId: string };
    if (requireToken && !oauth!.validateAuthorizationHeader(request.headers.authorization)) {
      return reply.code(401).send({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32001, message: 'UNAUTHORIZED', data: { retryable: false } },
      });
    }
    const body = (request.body ?? {}) as Record<string, unknown>;
    const method = typeof body.method === 'string' ? body.method : '';
    const aiId = body.id ?? null;

    // Task 1.8 — dual protocol era detection.
    const headerVersion = request.headers['mcp-protocol-version'] as string | undefined;
    const era = detectProtocolVersion(headerVersion, body);
    if (method === 'initialize') {
      // Legacy clients receive a synthetic session id; 2026 clients are stateless.
      const session = legacySessions.createSession();
      reply.header('Mcp-Session-Id', session.sessionId);
    } else {
      const sessionIdHeader = request.headers['mcp-session-id'] as string | undefined;
      if (era === '2025-11-25' && sessionIdHeader !== undefined) {
        const session = legacySessions.getSession(sessionIdHeader);
        if (session === null) {
          return reply.code(404).send({
            jsonrpc: '2.0',
            id: aiId,
            error: { code: -32001, message: 'SESSION_NOT_FOUND', data: { retryable: false, reinitialize: true } },
          });
        }
      }
    }
    const eraError = validateForEra(method, era);
    if (eraError !== null) {
      return reply.code(405).send({
        jsonrpc: '2.0',
        id: aiId,
        error: { code: -32007, message: eraError, data: { retryable: false } },
      });
    }

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

  return { app, context: { registry, catalog, journal, oauth, legacySessions } };
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
