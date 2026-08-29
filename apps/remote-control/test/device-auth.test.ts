import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RemoteControlDatabase } from '../src/db.js';
import {
  issueEnrollmentCode,
  redeemEnrollmentCode,
  revokeDevice,
  verifyDeviceToken,
} from '../src/auth/device-auth.js';

const temporaryRoots: string[] = [];

async function openDatabase(): Promise<RemoteControlDatabase> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-auth-'));
  temporaryRoots.push(root);
  return new RemoteControlDatabase(path.join(root, 'remote-control.sqlite'));
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('remote-control device enrollment', () => {
  it('issues a ten-minute enrollment whose raw code is never persisted', async () => {
    const db = await openDatabase();
    const now = new Date('2026-08-29T10:00:00.000Z');
    const issued = issueEnrollmentCode(db, 'desktop-1', now);

    expect(issued.expiresAt).toBe('2026-08-29T10:10:00.000Z');
    const row = db.connection.prepare(
      'SELECT secret_hash, expires_at FROM enrollments WHERE enrollment_id = ?',
    ).get(issued.enrollmentId) as { secret_hash: string; expires_at: string } | undefined;
    expect(row?.secret_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(row?.secret_hash).not.toContain(issued.code);
    expect(row?.expires_at).toBe(issued.expiresAt);
    db.close();
  });

  it('redeems once, persists only a SHA-256 token hash, and rejects a second redemption', async () => {
    const db = await openDatabase();
    const now = new Date('2026-08-29T10:00:00.000Z');
    const issued = issueEnrollmentCode(db, 'desktop-1', now);
    const redeemed = redeemEnrollmentCode(db, issued.enrollmentId, issued.code, now);

    const device = db.connection.prepare(
      'SELECT token_hash FROM devices WHERE device_id = ?',
    ).get(redeemed.deviceId) as { token_hash: string } | undefined;
    expect(device?.token_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(device?.token_hash).not.toContain(redeemed.deviceToken);
    expect(() => redeemEnrollmentCode(db, issued.enrollmentId, issued.code, now)).toThrow();
    db.close();
  });

  it('rejects an enrollment after its ten-minute expiry', async () => {
    const db = await openDatabase();
    const now = new Date('2026-08-29T10:00:00.000Z');
    const issued = issueEnrollmentCode(db, 'desktop-1', now);
    expect(() => redeemEnrollmentCode(
      db,
      issued.enrollmentId,
      issued.code,
      new Date('2026-08-29T10:10:00.001Z'),
    )).toThrow();
    db.close();
  });

  it('verifies only the correct active token and fails after revocation', async () => {
    const db = await openDatabase();
    const token = 'correct-device-token';
    const hash = `sha256:${createHash('sha256').update(token).digest('hex')}`;
    db.connection.prepare(
      'INSERT INTO devices (device_id, label, token_hash, created_at) VALUES (?, ?, ?, ?)',
    ).run('device-1', 'desktop-1', hash, '2026-08-29T10:00:00.000Z');

    expect(verifyDeviceToken(db, 'device-1', token)).toBe(true);
    expect(verifyDeviceToken(db, 'device-1', 'wrong-token')).toBe(false);
    revokeDevice(db, 'device-1', new Date('2026-08-29T10:01:00.000Z'));
    expect(verifyDeviceToken(db, 'device-1', token)).toBe(false);
    db.close();
  });
});
