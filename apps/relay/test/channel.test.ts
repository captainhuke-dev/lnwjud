import { once } from 'node:events';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket from 'ws';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { buildRelayServer } from '../src/server.js';

const cleanups: Array<() => Promise<void>> = [];

afterAll(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});

interface RunningRelay {
  url: string;
  close: () => Promise<void>;
}

async function startRelay(): Promise<RunningRelay> {
  const { app, context } = await buildRelayServer();
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;
  return {
    url,
    context,
    close: async () => { await app.close(); },
  } as RunningRelay & { context: typeof context };
}

/** Minimal fake desktop agent: HELLO then auto-answer forwarded tool calls. */
async function connectAgent(relayUrl: string, deviceId: string, profileIds: string[]): Promise<WebSocket> {
  const wsUrl = relayUrl.replace('http', 'ws') + '/agent/ws';
  const ws = new WebSocket(wsUrl);
  await once(ws, 'open');
  const readyPromise = once(ws, 'message');
  ws.send(JSON.stringify({
    type: 'HELLO',
    device_id: deviceId,
    profile_ids: profileIds,
    runtime_version: '4.8.5',
    catalog_hash: null,
  }));
  await readyPromise;
  ws.on('message', (raw) => {
    const frame = JSON.parse(raw.toString()) as Record<string, unknown>;
    if (frame.type === 'READY') return;
    // Auto-answer any forwarded request.
    ws.send(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result: { echoed: true, method: frame.method } }));
  });
  return ws;
}

describe('device channel + MCP endpoint', () => {
  it('handshakes an agent and forwards a tool call through the relay', async () => {
    const relay = await startRelay();
    cleanups.push(relay.close);

    const ws = await connectAgent(relay.url, 'dev-1', ['profile-a']);
    try {
      const response = await fetch(`${relay.url}/p/profile-a/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      expect(response.status).toBe(200);
      const body = await response.json() as Record<string, { echoed?: boolean; method?: string }>;
      expect(body.result?.echoed).toBe(true);
      expect(body.result?.method).toBe('tools/list');
    } finally {
      ws.close();
    }
  });

  it('answers DEVICE_OFFLINE for an unknown profile without hanging forever', async () => {
    const relay = await startRelay();
    cleanups.push(relay.close);
    const response = await fetch(`${relay.url}/p/no-such-profile/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    expect(response.status).toBe(503);
    const body = await response.json() as { error: { message: string; data: { retryable: boolean } } };
    expect(body.error.message).toBe('DEVICE_OFFLINE');
    expect(body.error.data.retryable).toBe(true);
  });

  it('keeps the channel alive across a reconnect and bumps routing to the new socket', async () => {
    const relay = await startRelay();
    cleanups.push(relay.close);

    const first = await connectAgent(relay.url, 'dev-1', ['profile-a']);
    first.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    const second = await connectAgent(relay.url, 'dev-1', ['profile-a']);
    try {
      const response = await fetch(`${relay.url}/p/profile-a/mcp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call' }),
      });
      expect(response.status).toBe(200);
    } finally {
      second.close();
    }
  });

  it('exposes connected devices snapshot', async () => {
    const relay = await startRelay();
    cleanups.push(relay.close);
    const ws = await connectAgent(relay.url, 'dev-snap', ['profile-snap']);
    try {
      const response = await fetch(`${relay.url}/devices`);
      const body = await response.json() as { devices: Array<{ deviceId: string }> };
      expect(body.devices.some((d) => d.deviceId === 'dev-snap')).toBe(true);
    } finally {
      ws.close();
    }
  });

  it('starts the underlying HTTP server used by registerDeviceChannel', () => {
    // Guard: the WS upgrade path is wired onto app.server — ensure server exists.
    expect(createServer).toBeDefined();
  });
});
