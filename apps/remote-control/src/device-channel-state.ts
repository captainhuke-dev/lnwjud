import type { RemoteControlDatabase } from './db.js';

export const DEVICE_PRESENCE_STALE_AFTER_MS = 45_000;
export const DEVICE_PRESENCE_OFFLINE_AFTER_MS = 90_000;

export type DevicePresenceState = 'online' | 'stale' | 'offline' | 'unknown';

export interface ClosableDeviceChannel {
  close(): void;
}

export interface DevicePresence {
  readonly state: DevicePresenceState;
  readonly lastSeenAt: string | null;
}

interface DevicePresenceRow {
  readonly last_seen_at: string | null;
}

export class DeviceChannelRegistry<T extends ClosableDeviceChannel> {
  private readonly current = new Map<string, T>();

  public register(deviceId: string, channel: T): void {
    requireDeviceId(deviceId);
    const previous = this.current.get(deviceId);
    if (previous !== undefined && previous !== channel) previous.close();
    this.current.set(deviceId, channel);
  }

  public unregister(deviceId: string, channel: T): void {
    requireDeviceId(deviceId);
    if (this.current.get(deviceId) === channel) this.current.delete(deviceId);
  }

  public get(deviceId: string): T | undefined {
    requireDeviceId(deviceId);
    return this.current.get(deviceId);
  }
}

export function recordAuthenticatedHeartbeat(
  db: RemoteControlDatabase,
  deviceId: string,
  observedAt: Date,
): void {
  requireDeviceId(deviceId);
  const observedAtIso = requireDate(observedAt, 'Heartbeat observation time');
  const device = db.connection.prepare(`
    SELECT last_seen_at
    FROM devices
    WHERE device_id = ? AND revoked_at IS NULL
  `).get(deviceId) as DevicePresenceRow | undefined;
  if (device === undefined) throw new Error('Active device is required for heartbeat');

  db.connection.prepare(`
    UPDATE devices
    SET last_seen_at = ?
    WHERE device_id = ? AND revoked_at IS NULL
  `).run(observedAtIso, deviceId);
}

export function getDevicePresence(
  db: RemoteControlDatabase,
  deviceId: string,
  now: Date,
): DevicePresence {
  requireDeviceId(deviceId);
  const nowMs = Date.parse(requireDate(now, 'Presence observation time'));
  const device = db.connection.prepare(`
    SELECT last_seen_at
    FROM devices
    WHERE device_id = ? AND revoked_at IS NULL
  `).get(deviceId) as DevicePresenceRow | undefined;

  if (device === undefined || device.last_seen_at === null) {
    return { state: 'unknown', lastSeenAt: null };
  }

  const lastSeenMs = Date.parse(device.last_seen_at);
  if (!Number.isFinite(lastSeenMs)) {
    return { state: 'unknown', lastSeenAt: device.last_seen_at };
  }

  const ageMs = nowMs - lastSeenMs;
  if (ageMs < 0) return { state: 'unknown', lastSeenAt: device.last_seen_at };
  if (ageMs >= DEVICE_PRESENCE_OFFLINE_AFTER_MS) {
    return { state: 'offline', lastSeenAt: device.last_seen_at };
  }
  if (ageMs >= DEVICE_PRESENCE_STALE_AFTER_MS) {
    return { state: 'stale', lastSeenAt: device.last_seen_at };
  }
  return { state: 'online', lastSeenAt: device.last_seen_at };
}

function requireDeviceId(deviceId: string): void {
  if (deviceId.trim().length === 0) throw new Error('Device id must be non-empty');
}

function requireDate(value: Date, label: string): string {
  if (!Number.isFinite(value.getTime())) throw new Error(`${label} must be valid`);
  return value.toISOString();
}
