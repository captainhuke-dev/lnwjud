import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { RemoteControlDatabase } from '../src/db.js';
import {
  DEVICE_PRESENCE_OFFLINE_AFTER_MS,
  DEVICE_PRESENCE_STALE_AFTER_MS,
  DeviceChannelRegistry,
  getDevicePresence,
  recordAuthenticatedHeartbeat,
} from '../src/device-channel-state.js';

class TestChannel {
  public closed = 0;

  public close(): void {
    this.closed += 1;
  }
}

let db: RemoteControlDatabase;

beforeAll(() => {
  db = new RemoteControlDatabase(':memory:');
});

beforeEach(() => {
  db.connection.exec('DELETE FROM devices;');
  db.connection.prepare(`
    INSERT INTO devices (device_id, label, token_hash, revoked_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'device-1',
    'Primary device',
    `sha256:${'a'.repeat(64)}`,
    null,
    '2026-08-29T13:10:00.000Z',
    null,
  );
  db.connection.prepare(`
    INSERT INTO devices (device_id, label, token_hash, revoked_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'revoked-device',
    'Revoked device',
    `sha256:${'b'.repeat(64)}`,
    '2026-08-29T13:11:00.000Z',
    '2026-08-29T13:10:00.000Z',
    null,
  );
});

afterAll(() => {
  db.close();
});

describe('remote-control device channel state', () => {
  it('keeps exactly one current channel per device and ignores stale unregisters', () => {
    const registry = new DeviceChannelRegistry<TestChannel>();
    const first = new TestChannel();
    const second = new TestChannel();

    registry.register('device-1', first);
    expect(registry.get('device-1')).toBe(first);

    registry.register('device-1', second);
    expect(first.closed).toBe(1);
    expect(registry.get('device-1')).toBe(second);

    registry.unregister('device-1', first);
    expect(registry.get('device-1')).toBe(second);

    registry.unregister('device-1', second);
    expect(registry.get('device-1')).toBeUndefined();
  });

  it('does not treat channel registration itself as an authenticated heartbeat', () => {
    const registry = new DeviceChannelRegistry<TestChannel>();
    registry.register('device-1', new TestChannel());

    expect(getDevicePresence(db, 'device-1', new Date('2026-08-29T13:12:00.000Z'))).toEqual({
      state: 'unknown',
      lastSeenAt: null,
    });
  });

  it('records heartbeats only for active devices', () => {
    const observedAt = new Date('2026-08-29T13:12:00.000Z');
    recordAuthenticatedHeartbeat(db, 'device-1', observedAt);

    expect(getDevicePresence(db, 'device-1', observedAt)).toEqual({
      state: 'online',
      lastSeenAt: '2026-08-29T13:12:00.000Z',
    });
    expect(() => recordAuthenticatedHeartbeat(db, 'revoked-device', observedAt)).toThrow();
    expect(() => recordAuthenticatedHeartbeat(db, 'missing-device', observedAt)).toThrow();
  });

  it('maps authenticated heartbeat age to online, stale, and offline at 45s and 90s', () => {
    expect(DEVICE_PRESENCE_STALE_AFTER_MS).toBe(45_000);
    expect(DEVICE_PRESENCE_OFFLINE_AFTER_MS).toBe(90_000);

    const observedAt = new Date('2026-08-29T13:12:00.000Z');
    recordAuthenticatedHeartbeat(db, 'device-1', observedAt);

    expect(getDevicePresence(db, 'device-1', new Date(observedAt.getTime() + 44_999)).state).toBe('online');
    expect(getDevicePresence(db, 'device-1', new Date(observedAt.getTime() + 45_000)).state).toBe('stale');
    expect(getDevicePresence(db, 'device-1', new Date(observedAt.getTime() + 89_999)).state).toBe('stale');
    expect(getDevicePresence(db, 'device-1', new Date(observedAt.getTime() + 90_000)).state).toBe('offline');
  });
});
