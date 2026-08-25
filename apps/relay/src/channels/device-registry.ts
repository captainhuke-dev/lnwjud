import { randomUUID } from 'node:crypto';
import type { RawData, WebSocket } from 'ws';

/**
 * Task 1.3 — in-memory device connection registry.
 *
 * Maps every connected desktop agent's WebSocket to the profiles it serves.
 * The relay NEVER dials devices: agents dial out to /agent/ws and are tracked
 * here. Request forwarding correlates JSON-RPC ids with pending promises.
 */

export interface DeviceConnection {
  readonly connectionId: string;
  readonly deviceId: string;
  readonly profileIds: readonly string[];
  readonly runtimeVersion: string;
  readonly catalogHash: string | null;
  readonly connectedAt: Date;
  readonly socket: WebSocket;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class DeviceRegistry {
  /** deviceId → active connection (latest wins; superseded connections are closed). */
  private readonly connections = new Map<string, DeviceConnection>();
  /** profileId → deviceId currently holding the channel. */
  private readonly profileRoutes = new Map<string, string>();
  /** requestId → pending forwarded request. */
  private readonly pending = new Map<string, PendingRequest>();

  public register(connection: Omit<DeviceConnection, 'connectionId' | 'connectedAt'>): DeviceConnection {
    const previous = this.connections.get(connection.deviceId);
    if (previous !== undefined && previous.socket.readyState === previous.socket.OPEN) {
      // Superseded by a newer connection from the same device (e.g. reconnect race).
      try { previous.socket.close(4000, 'superseded'); } catch { /* already closing */ }
    }
    const full: DeviceConnection = {
      ...connection,
      connectionId: randomUUID(),
      connectedAt: new Date(),
    };
    this.connections.set(full.deviceId, full);
    for (const profileId of full.profileIds) {
      this.profileRoutes.set(profileId, full.deviceId);
    }
    return full;
  }

  public unregister(deviceId: string, socket?: WebSocket): void {
    const existing = this.connections.get(deviceId);
    if (existing === undefined) return;
    if (socket !== undefined && existing.socket !== socket) return; // stale close event
    this.connections.delete(deviceId);
    for (const [profileId, holder] of this.profileRoutes) {
      if (holder === deviceId) this.profileRoutes.delete(profileId);
    }
    for (const [requestId, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('device disconnected'));
      this.pending.delete(requestId);
    }
  }

  public routeForProfile(profileId: string): DeviceConnection | null {
    const deviceId = this.profileRoutes.get(profileId);
    if (deviceId === undefined) return null;
    return this.connections.get(deviceId) ?? null;
  }

  public isOnline(profileId: string): boolean {
    return this.routeForProfile(profileId) !== null;
  }

  /**
   * Forward a JSON-RPC request to the device serving `profileId`.
   * Resolves with the device's response payload; rejects on timeout or disconnect.
   */
  public forward<T = unknown>(profileId: string, requestId: string, payload: unknown, timeoutMs: number): Promise<T> {
    const connection = this.routeForProfile(profileId);
    if (connection === null) return Promise.reject(new Error('DEVICE_OFFLINE'));
    if (connection.socket.readyState !== connection.socket.OPEN) return Promise.reject(new Error('DEVICE_OFFLINE'));

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error('DEVICE_TIMEOUT'));
      }, timeoutMs);
      this.pending.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
      });
      connection.socket.send(JSON.stringify({ ...payload as object, id: requestId }));
    });
  }

  /** Deliver a response frame arriving from a device socket. */
  public deliver(requestId: string, payload: unknown): boolean {
    const entry = this.pending.get(requestId);
    if (entry === undefined) return false;
    clearTimeout(entry.timer);
    this.pending.delete(requestId);
    entry.resolve(payload);
    return true;
  }

  public snapshot(): Array<{ deviceId: string; profiles: readonly string[]; connectedAt: Date }> {
    return [...this.connections.values()].map((c) => ({
      deviceId: c.deviceId,
      profiles: c.profileIds,
      connectedAt: c.connectedAt,
    }));
  }
}

/** Parse and validate an agent HELLO frame. Returns null when malformed. */
export function parseHello(raw: RawData): {
  type: 'HELLO';
  agent_protocol: string;
  device_id: string;
  profile_ids: string[];
  runtime_version: string;
  catalog_hash: string | null;
} | null {
  try {
    const value: unknown = JSON.parse(raw.toString());
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;
    if (record.type !== 'HELLO') return null;
    if (typeof record.agent_protocol !== 'string' || record.agent_protocol.length === 0) return null;
    if (typeof record.device_id !== 'string' || record.device_id.length === 0) return null;
    if (!Array.isArray(record.profile_ids)) return null;
    const profileIds = record.profile_ids.filter((id): id is string => typeof id === 'string');
    return {
      type: 'HELLO',
      agent_protocol: record.agent_protocol as string,
      device_id: record.device_id,
      profile_ids: profileIds,
      runtime_version: typeof record.runtime_version === 'string' ? record.runtime_version : 'unknown',
      catalog_hash: typeof record.catalog_hash === 'string' ? record.catalog_hash : null,
    };
  } catch {
    return null;
  }
}
