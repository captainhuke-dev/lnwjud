import { describe, expect, it } from 'vitest';
import { buildRelayServer } from '../src/server.js';

describe('lnwjud relay server', () => {
  it('serves live healthz', async () => {
    const { app } = await buildRelayServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/healthz' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'live' });
    } finally {
      await app.close();
    }
  });

  it('serves readyz', async () => {
    const { app } = await buildRelayServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/readyz' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ready' });
    } finally {
      await app.close();
    }
  });

  it('rejects MCP calls for offline profiles with a retryable error', async () => {
    process.env.RELAY_DEVICE_GRACE_MS = '0';
    const { app } = await buildRelayServer();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/p/offline-profile/mcp',
        payload: { jsonrpc: '2.0', id: 1, method: 'ping' },
      });
      expect(response.statusCode).toBe(503);
      const body = response.json() as { error: { message: string; data: { retryable: boolean } } };
      expect(body.error.message).toBe('DEVICE_OFFLINE');
      expect(body.error.data.retryable).toBe(true);
    } finally {
      await app.close();
    }
  });
});
