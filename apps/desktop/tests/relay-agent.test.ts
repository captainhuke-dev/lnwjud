import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import WebSocket, { WebSocketServer } from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { RelayAgent } from '../src/main/relay-agent.js';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((fn) => fn()));
});

interface MockRelay {
  url: string;
  /** Resolves on every HELLO (reconnect marker). */
  /** Manually drop all sockets to simulate a link failure. */
  killSockets(): void;
  /** Last forwarded JSON-RPC frame received. */
  lastRequest: Record<string, unknown> | null;
  /** Response to send back for the last request. */
  respond(result: unknown): void;
  forwardRequest(method: string, params: unknown): void;
}

async function startMockRelay(): Promise<MockRelay> {
  const server = createServer();
  const wss = new WebSocketServer({ server });
  let helloResolve: ((value: { deviceId: string; catalogHash: string | null }) => void) | null = null;
  const helloPromise = new Promise<{ deviceId: string; catalogHash: string | null }>((resolve) => {
    helloResolve = resolve;
  });
  let lastRequest: Record<string, unknown> | null = null;
  let lastSocket: WebSocket | null = null;
  let respondWith: unknown = null;
  const forwardRequest = (method: string, params: unknown): void => {
    if (lastSocket === null || lastSocket.readyState !== WebSocket.OPEN) return;
    lastSocket.send(JSON.stringify({ jsonrpc: '2.0', id: 'fwd-1', method, params }));
  };

  wss.on('connection', (ws: WebSocket) => {
    lastSocket = ws;
    ws.on('message', (raw: WebSocket.RawData): void => {
      const frame = JSON.parse(raw.toString()) as Record<string, unknown>;
      if (frame.type === 'HELLO') {
        ws.send(JSON.stringify({ type: 'READY', connection_id: 'c1', heartbeat_interval_ms: 5000 }));
        helloResolve?.({
          deviceId: String(frame.device_id),
          catalogHash: typeof frame.catalog_hash === 'string' ? frame.catalog_hash : null,
        });
        return;
      }
      if (frame.type === 'HEARTBEAT') return;
      lastRequest = frame;
      if (respondWith !== null && typeof frame.id !== 'undefined') {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: frame.id, result: respondWith }));
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  const url = `ws://127.0.0.1:${address.port}/agent/ws`;
  cleanups.push(async () => {
    for (const client of WebSocket.getClients?.() ?? []) void client;
    server.close();
    wss.close();
  });

  return {
    url,
    get hello() { return helloPromise; },
    killSockets: () => { lastSocket?.terminate(); },
    get lastRequest() { return lastRequest; },
    respond: (result: unknown) => { respondWith = result; },
    forwardRequest,
  } as MockRelay & { hello: MockRelay['hello'] };
}

describe('relay agent (desktop)', () => {
  it('dials out, sends HELLO with identity and catalog hash', async () => {
    const relay = await startMockRelay();
    const tools = [{ name: 'read_file' }];
    const agent = new RelayAgent({
      relayUrl: relay.url,
      deviceId: 'pc-1',
      profileIds: ['profile-a'],
      runtimeVersion: '4.8.5',
      invokeTool: async (): Promise<unknown> => ({}),
      listTools: (): readonly unknown[] => tools,
    });
    const helloPromise = relay.hello;
    agent.start();
    const hello = await Promise.race([helloPromise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('no HELLO in 3s')), 3_000))]);
    expect(hello.deviceId).toBe('pc-1');
    expect(hello.catalogHash).not.toBeNull();
    agent.stop();
  }, 10_000);

  it('answers a forwarded tools/call by invoking the local registry', async () => {
    const relay = await startMockRelay();
    let invokedName = '';
    const agent = new RelayAgent({
      relayUrl: relay.url,
      deviceId: 'pc-1',
      profileIds: ['profile-a'],
      runtimeVersion: '4.8.5',
      invokeTool: async (name: string): Promise<unknown> => {
        invokedName = name;
        return { content: [{ type: 'text', text: `invoked ${name}` }] };
      },
      listTools: (): readonly unknown[] => [],
    });
    relay.respond({ content: [{ type: 'text', text: 'done' }] });
    agent.start();
    await Promise.race([relay.hello, new Promise((_, rej) => setTimeout(() => rej(new Error('no HELLO')), 3_000))]);
    // Simulate the relay forwarding a call through the device socket.
    relay.forwardRequest('tools/call', { name: 'delete_file', arguments: {} });
    const deadline = Date.now() + 2_000;
    while (Date.now() < deadline) {
      if (invokedName === 'delete_file') break;
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(invokedName).toBe('delete_file');
    agent.stop();
  }, 15_000);

  it('reconnects after the socket is dropped and re-sends HELLO', async () => {
    const relay = await startMockRelay();
    const agent = new RelayAgent({
      relayUrl: relay.url,
      deviceId: 'pc-1',
      profileIds: ['profile-a'],
      runtimeVersion: '4.8.5',
      invokeTool: async (): Promise<unknown> => ({}),
      listTools: (): readonly unknown[] => [],
    });
    agent.start();
    await Promise.race([relay.hello, new Promise((_, rej) => setTimeout(() => rej(new Error('no first HELLO')), 3_000))]);

    relay.killSockets(); // simulate network cut
    const reconnectHello = await Promise.race([
      relay.hello,
      new Promise<{ deviceId: string }>((_, rej) => setTimeout(() => rej(new Error('no reconnect HELLO within 8s')), 8_000)),
    ]);
    expect(reconnectHello.deviceId).toBe('pc-1');
    agent.stop();
  }, 20_000);
});
