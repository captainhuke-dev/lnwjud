import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { redeemEnrollmentCode, issueEnrollmentCode } from '../src/auth/device-auth.js';
import { RemoteControlDatabase } from '../src/db.js';
import { authorizeDeviceUpgrade } from '../src/device-upgrade-auth.js';

const temporaryRoots: string[] = [];

async function createDatabase(): Promise<RemoteControlDatabase> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-upgrade-auth-'));
  temporaryRoots.push(root);
  return new RemoteControlDatabase(path.join(root, 'remote-control.sqlite'));
}

async function enrolledDevice(): Promise<{
  readonly db: RemoteControlDatabase;
  readonly deviceId: string;
  readonly deviceToken: string;
}> {
  const db = await createDatabase();
  const now = new Date('2026-08-29T12:50:00.000Z');
  const issued = issueEnrollmentCode(db, 'test-device', now);
  const redeemed = redeemEnrollmentCode(db, issued.enrollmentId, issued.code, now);
  return { db, ...redeemed };
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('remote-control device websocket upgrade authorization', () => {
  it('authorizes only the device websocket path with protocol v1 and a valid bearer token', async () => {
    const { db, deviceId, deviceToken } = await enrolledDevice();
    try {
      expect(authorizeDeviceUpgrade(db, {
        url: `/device/ws?deviceId=${encodeURIComponent(deviceId)}&protocolVersion=1`,
        authorization: `Bearer ${deviceToken}`,
      })).toEqual({ deviceId, protocolVersion: 1 });
    } finally {
      db.close();
    }
  });

  it.each([
    '/other?deviceId=device-1&protocolVersion=1',
    '/device/ws?deviceId=device-1&protocolVersion=2',
    '/device/ws?protocolVersion=1',
    '/device/ws?deviceId=%20%20%20&protocolVersion=1',
    '/device/ws?deviceId=device-1&protocolVersion=1&deviceToken=secret',
    '/device/ws?deviceId=device-1&protocolVersion=1&token=secret',
    '/device/ws?deviceId=device-1&protocolVersion=1&extra=value',
  ])('rejects an invalid or secret-bearing upgrade URL: %s', async (url) => {
    const { db, deviceToken } = await enrolledDevice();
    try {
      expect(() => authorizeDeviceUpgrade(db, {
        url,
        authorization: `Bearer ${deviceToken}`,
      })).toThrow();
    } finally {
      db.close();
    }
  });

  it.each([
    undefined,
    '',
    'Basic abc',
    'Bearer',
    'Bearer ',
    'Bearer wrong-token',
    'Bearer valid-token extra',
  ])('rejects a missing or invalid authorization header %#', async (authorization) => {
    const { db, deviceId } = await enrolledDevice();
    try {
      expect(() => authorizeDeviceUpgrade(db, {
        url: `/device/ws?deviceId=${encodeURIComponent(deviceId)}&protocolVersion=1`,
        authorization,
      })).toThrow();
    } finally {
      db.close();
    }
  });

  it('rejects a token belonging to a different device', async () => {
    const first = await enrolledDevice();
    const secondNow = new Date('2026-08-29T12:51:00.000Z');
    try {
      const issued = issueEnrollmentCode(first.db, 'other-device', secondNow);
      const second = redeemEnrollmentCode(first.db, issued.enrollmentId, issued.code, secondNow);
      expect(() => authorizeDeviceUpgrade(first.db, {
        url: `/device/ws?deviceId=${encodeURIComponent(first.deviceId)}&protocolVersion=1`,
        authorization: `Bearer ${second.deviceToken}`,
      })).toThrow();
    } finally {
      first.db.close();
    }
  });

  it('rejects a revoked device token', async () => {
    const { db, deviceId, deviceToken } = await enrolledDevice();
    try {
      db.connection.prepare('UPDATE devices SET revoked_at = ? WHERE device_id = ?')
        .run('2026-08-29T12:52:00.000Z', deviceId);
      expect(() => authorizeDeviceUpgrade(db, {
        url: `/device/ws?deviceId=${encodeURIComponent(deviceId)}&protocolVersion=1`,
        authorization: `Bearer ${deviceToken}`,
      })).toThrow();
    } finally {
      db.close();
    }
  });
});
