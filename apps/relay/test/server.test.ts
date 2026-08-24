import { describe, expect, it } from 'vitest';
import { buildRelayServer } from '../src/server.js';

describe('lnwjud relay server', () => {
  it('serves live healthz', async () => {
    const app = await buildRelayServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/healthz' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'live' });
    } finally {
      await app.close();
    }
  });

  it('serves readyz', async () => {
    const app = await buildRelayServer();
    try {
      const response = await app.inject({ method: 'GET', url: '/readyz' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ready' });
    } finally {
      await app.close();
    }
  });
});
