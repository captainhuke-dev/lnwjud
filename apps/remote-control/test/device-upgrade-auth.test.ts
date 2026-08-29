import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { redeemEnrollmentCode, issueEnrollmentCode } from '../src/auth/device-auth.js';
import { RemoteControlDatabase } from '../src/db.js';
import { authorizeDeviceUpgrade } from '../src/device-upgrade-auth.js';

interface EnrolledDevice {
  readonly deviceId: string;
  readonly deviceToken: string;
}

let root = '';
let db: RemoteControlDatabase;
let active: EnrolledDevice;
let other: EnrolledDevice;
let revoked: EnrolledDevice;

function enroll(label: string, now: Date): EnrolledDevice {
  const issued = issueEnrollmentCode(db, label, now);
  return redeemEnrollmentCode(db, issued.enrollmentId, issued.code, now);
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-upgrade-auth-'));
  db = new RemoteControlDatabase(path.join(root, 'remote-control.sqlite'));
  active = enroll('active-device', new Date('2026-08-29T12:50:00.000Z'));
  other = enroll('other-device', new Date('2026-08-29T12:51:00.000Z'));
  revoked = enroll('revoked-device', new Date('2026-08-29T12:52:00.000Z'));
  db.connection.prepare('UPDATE devices SET revoked_at = ? WHERE device_id = ?')
    .run('2026-08-29T12:53:00.000Z', revoked.deviceId);
});

afterAll(async () => {
  db.close();
  await rm(root, { recursive: true, force: true });
});

describe('remote-control device websocket upgrade authorization', () => {
  it('authorizes only the device websocket path with protocol v1 and a valid bearer token', () => {
    expect(authorizeDeviceUpgrade(db, {
      url: `/device/ws?deviceId=${encodeURIComponent(active.deviceId)}&protocolVersion=1`,
      authorization: `Bearer ${active.deviceToken}`,
    })).toEqual({ deviceId: active.deviceId, protocolVersion: 1 });
  });

  it.each([
    '/other?deviceId=device-1&protocolVersion=1',
    '/device/ws?deviceId=device-1&protocolVersion=2',
    '/device/ws?protocolVersion=1',
    '/device/ws?deviceId=%20%20%20&protocolVersion=1',
    '/device/ws?deviceId=device-1&protocolVersion=1&deviceToken=secret',
    '/device/ws?deviceId=device-1&protocolVersion=1&token=secret',
    '/device/ws?deviceId=device-1&protocolVersion=1&extra=value',
  ])('rejects an invalid or secret-bearing upgrade URL: %s', (url) => {
    expect(() => authorizeDeviceUpgrade(db, {
      url,
      authorization: `Bearer ${active.deviceToken}`,
    })).toThrow();
  });

  it.each([
    undefined,
    '',
    'Basic abc',
    'Bearer',
    'Bearer ',
    'Bearer wrong-token',
    'Bearer valid-token extra',
  ])('rejects a missing or invalid authorization header %#', (authorization) => {
    expect(() => authorizeDeviceUpgrade(db, {
      url: `/device/ws?deviceId=${encodeURIComponent(active.deviceId)}&protocolVersion=1`,
      authorization,
    })).toThrow();
  });

  it('rejects a token belonging to a different device', () => {
    expect(() => authorizeDeviceUpgrade(db, {
      url: `/device/ws?deviceId=${encodeURIComponent(active.deviceId)}&protocolVersion=1`,
      authorization: `Bearer ${other.deviceToken}`,
    })).toThrow();
  });

  it('rejects a revoked device token', () => {
    expect(() => authorizeDeviceUpgrade(db, {
      url: `/device/ws?deviceId=${encodeURIComponent(revoked.deviceId)}&protocolVersion=1`,
      authorization: `Bearer ${revoked.deviceToken}`,
    })).toThrow();
  });
});
