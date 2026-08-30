import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { issueEnrollmentCode, redeemEnrollmentCode } from '../src/auth/device-auth.js';
import { RemoteControlDatabase } from '../src/db.js';
import {
  DeviceChannelRegistry,
  getDevicePresence,
  type ClosableDeviceChannel,
} from '../src/device-channel-state.js';
import { attachAuthorizedDeviceChannel } from '../src/device-channel-session.js';
import { authorizeDeviceUpgrade, type AuthorizedDeviceUpgrade } from '../src/device-upgrade-auth.js';

interface EnrolledDevice {
  readonly deviceId: string;
  readonly deviceToken: string;
}

class FakeChannel implements ClosableDeviceChannel {
  public closeCalls = 0;

  public close(): void {
    this.closeCalls += 1;
  }
}

let root = '';
let db: RemoteControlDatabase;
let sequence = 0;

function enroll(label: string, now: Date): EnrolledDevice {
  const issued = issueEnrollmentCode(db, label, now);
  return redeemEnrollmentCode(db, issued.enrollmentId, issued.code, now);
}

function authorize(device: EnrolledDevice): AuthorizedDeviceUpgrade {
  return authorizeDeviceUpgrade(db, {
    url: `/device/ws?deviceId=${encodeURIComponent(device.deviceId)}&protocolVersion=1`,
    authorization: `Bearer ${device.deviceToken}`,
  });
}

function uniqueLabel(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-channel-session-'));
  db = new RemoteControlDatabase(path.join(root, 'remote-control.sqlite'));
});

afterAll(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});

describe('remote-control authenticated device channel lifecycle', () => {
  it('attaches an authorized channel as current and records initial presence', () => {
    const enrolledAt = new Date('2026-08-29T13:30:00.000Z');
    const connectedAt = new Date('2026-08-29T13:31:00.000Z');
    const device = enroll(uniqueLabel('attach'), enrolledAt);
    const registry = new DeviceChannelRegistry<FakeChannel>();
    const channel = new FakeChannel();

    const session = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorize(device),
      channel,
      connectedAt,
    );

    expect(session.deviceId).toBe(device.deviceId);
    expect(session.protocolVersion).toBe(1);
    expect(registry.get(device.deviceId)).toBe(channel);
    expect(getDevicePresence(db, device.deviceId, connectedAt)).toEqual({
      state: 'online',
      lastSeenAt: connectedAt.toISOString(),
    });
  });

  it('replaces the previous channel without letting an old detach remove the new current channel', () => {
    const enrolledAt = new Date('2026-08-29T13:32:00.000Z');
    const device = enroll(uniqueLabel('replace'), enrolledAt);
    const registry = new DeviceChannelRegistry<FakeChannel>();
    const firstChannel = new FakeChannel();
    const secondChannel = new FakeChannel();
    const authorized = authorize(device);

    const first = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorized,
      firstChannel,
      new Date('2026-08-29T13:33:00.000Z'),
    );
    const second = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorized,
      secondChannel,
      new Date('2026-08-29T13:34:00.000Z'),
    );

    expect(firstChannel.closeCalls).toBe(1);
    expect(registry.get(device.deviceId)).toBe(secondChannel);

    first.detach();
    expect(registry.get(device.deviceId)).toBe(secondChannel);

    second.detach();
    expect(registry.get(device.deviceId)).toBeUndefined();
  });

  it('rejects heartbeat from a superseded channel and only lets the current channel advance presence', () => {
    const enrolledAt = new Date('2026-08-29T13:35:00.000Z');
    const device = enroll(uniqueLabel('heartbeat'), enrolledAt);
    const registry = new DeviceChannelRegistry<FakeChannel>();
    const firstChannel = new FakeChannel();
    const secondChannel = new FakeChannel();
    const authorized = authorize(device);

    const first = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorized,
      firstChannel,
      new Date('2026-08-29T13:36:00.000Z'),
    );
    const second = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorized,
      secondChannel,
      new Date('2026-08-29T13:37:00.000Z'),
    );

    expect(() => first.heartbeat(new Date('2026-08-29T13:38:00.000Z'))).toThrow();
    expect(getDevicePresence(db, device.deviceId, new Date('2026-08-29T13:37:00.000Z'))).toEqual({
      state: 'online',
      lastSeenAt: '2026-08-29T13:37:00.000Z',
    });

    second.heartbeat(new Date('2026-08-29T13:38:00.000Z'));
    expect(getDevicePresence(db, device.deviceId, new Date('2026-08-29T13:38:00.000Z'))).toEqual({
      state: 'online',
      lastSeenAt: '2026-08-29T13:38:00.000Z',
    });
  });

  it('fails closed when a connected device is revoked before its next heartbeat', () => {
    const enrolledAt = new Date('2026-08-29T13:39:00.000Z');
    const connectedAt = new Date('2026-08-29T13:40:00.000Z');
    const device = enroll(uniqueLabel('revoked'), enrolledAt);
    const registry = new DeviceChannelRegistry<FakeChannel>();
    const channel = new FakeChannel();
    const session = attachAuthorizedDeviceChannel(
      db,
      registry,
      authorize(device),
      channel,
      connectedAt,
    );

    db.connection.prepare('UPDATE devices SET revoked_at = ? WHERE device_id = ?')
      .run('2026-08-29T13:40:30.000Z', device.deviceId);

    expect(() => session.heartbeat(new Date('2026-08-29T13:41:00.000Z'))).toThrow();
    expect(channel.closeCalls).toBe(1);
    expect(registry.get(device.deviceId)).toBeUndefined();

    const row = db.connection.prepare('SELECT last_seen_at FROM devices WHERE device_id = ?')
      .get(device.deviceId) as { readonly last_seen_at: string | null } | undefined;
    expect(row?.last_seen_at).toBe(connectedAt.toISOString());
  });
});
