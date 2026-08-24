import type { FastifyInstance } from 'fastify';
import { WebSocketServer, type WebSocket } from 'ws';
import { DeviceRegistry, parseHello } from './device-registry.js';

/**
 * Task 1.3 — /agent/ws device channel.
 *
 * Handshake: agent connects and sends a HELLO frame within 10s or is dropped.
 * Server replies READY with the lease epoch. Afterwards the socket carries
 * correlated JSON-RPC frames (relay→device requests, device→relay responses).
 */
export const HEARTBEAT_INTERVAL_MS = 5_000;
const HELLO_TIMEOUT_MS = 10_000;

export function registerDeviceChannel(app: FastifyInstance, registry: DeviceRegistry): void {
  const wss = new WebSocketServer({ noServer: true });

  app.server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    if (url.pathname !== '/agent/ws') {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws: WebSocket) => {
    let deviceId: string | null = null;
    let registered = false;

    // Drop agents that never complete the handshake.
    const helloTimer = setTimeout(() => {
      if (!registered) try { ws.close(4001, 'HELLO timeout'); } catch { /* noop */ }
    }, HELLO_TIMEOUT_MS);

    ws.on('message', (raw) => {
      if (!registered) {
        const hello = parseHello(raw);
        if (hello === null) {
          try { ws.close(4002, 'invalid HELLO'); } catch { /* noop */ }
          clearTimeout(helloTimer);
          return;
        }
        const connection = registry.register({
          deviceId: hello.device_id,
          profileIds: hello.profile_ids,
          runtimeVersion: hello.runtime_version,
          catalogHash: hello.catalog_hash,
          socket: ws,
        });
        deviceId = connection.deviceId;
        registered = true;
        clearTimeout(helloTimer);
        ws.send(JSON.stringify({
          type: 'READY',
          connection_id: connection.connectionId,
          heartbeat_interval_ms: HEARTBEAT_INTERVAL_MS,
        }));
        return;
      }

      // Post-handshake frames: responses to forwarded requests or heartbeats.
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }
      if (frame.type === 'HEARTBEAT') return; // liveness only
      if (typeof frame.id === 'string' || typeof frame.id === 'number') {
        registry.deliver(String(frame.id), frame);
      }
    });

    ws.on('close', () => {
      clearTimeout(helloTimer);
      if (deviceId !== null) registry.unregister(deviceId, ws);
    });
    ws.on('error', () => {
      clearTimeout(helloTimer);
      if (deviceId !== null) registry.unregister(deviceId, ws);
      try { ws.terminate(); } catch { /* noop */ }
    });
  });
}
