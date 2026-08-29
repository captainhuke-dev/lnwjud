import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { RemoteControlDatabase } from '../db.js';

const ENROLLMENT_TTL_MS = 10 * 60 * 1000;
const HASH_PREFIX = 'sha256:';
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export interface IssuedEnrollment {
  readonly enrollmentId: string;
  readonly code: string;
  readonly expiresAt: string;
}

export interface RedeemedDevice {
  readonly deviceId: string;
  readonly deviceToken: string;
}

export function issueEnrollmentCode(
  db: RemoteControlDatabase,
  label: string,
  now: Date,
): IssuedEnrollment {
  const enrollmentId = randomUUID();
  const code = makeSecret();
  const expiresAt = new Date(now.getTime() + ENROLLMENT_TTL_MS).toISOString();
  db.connection.prepare(
    'INSERT INTO enrollments (enrollment_id, secret_hash, label, expires_at) VALUES (?, ?, ?, ?)',
  ).run(enrollmentId, hashSecret(code), label, expiresAt);
  return { enrollmentId, code, expiresAt };
}

export function redeemEnrollmentCode(
  db: RemoteControlDatabase,
  enrollmentId: string,
  code: string,
  now: Date,
): RedeemedDevice {
  db.connection.exec('BEGIN IMMEDIATE;');
  try {
    const row = db.connection.prepare(
      'SELECT secret_hash, label, expires_at, redeemed_at FROM enrollments WHERE enrollment_id = ?',
    ).get(enrollmentId) as {
      secret_hash: string;
      label: string;
      expires_at: string;
      redeemed_at: string | null;
    } | undefined;

    if (!row) throw new Error('Enrollment does not exist');
    if (row.redeemed_at !== null) throw new Error('Enrollment has already been redeemed');
    const expiresAtMs = Date.parse(row.expires_at);
    if (!Number.isFinite(expiresAtMs) || now.getTime() >= expiresAtMs) {
      throw new Error('Enrollment has expired');
    }
    if (!secretMatches(row.secret_hash, code)) throw new Error('Enrollment code is invalid');

    const deviceId = randomUUID();
    const deviceToken = makeSecret();
    const redeemedAt = now.toISOString();
    db.connection.prepare(
      'UPDATE enrollments SET redeemed_at = ? WHERE enrollment_id = ?',
    ).run(redeemedAt, enrollmentId);
    db.connection.prepare(
      'INSERT INTO devices (device_id, label, token_hash, created_at) VALUES (?, ?, ?, ?)',
    ).run(deviceId, row.label, hashSecret(deviceToken), redeemedAt);
    db.connection.exec('COMMIT;');
    return { deviceId, deviceToken };
  } catch (error) {
    db.connection.exec('ROLLBACK;');
    throw error;
  }
}

export function verifyDeviceToken(
  db: RemoteControlDatabase,
  deviceId: string,
  token: string,
): boolean {
  const row = db.connection.prepare(
    'SELECT token_hash, revoked_at FROM devices WHERE device_id = ?',
  ).get(deviceId) as { token_hash: string; revoked_at: string | null } | undefined;
  if (!row || row.revoked_at !== null) return false;
  return secretMatches(row.token_hash, token);
}

export function revokeDevice(db: RemoteControlDatabase, deviceId: string, now: Date): void {
  db.connection.prepare(
    'UPDATE devices SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL',
  ).run(now.toISOString(), deviceId);
}

function makeSecret(): string {
  return randomBytes(32).toString('base64url');
}

function hashSecret(secret: string): string {
  return `${HASH_PREFIX}${createHash('sha256').update(secret).digest('hex')}`;
}

function secretMatches(storedHash: string, secret: string): boolean {
  if (!HASH_PATTERN.test(storedHash)) return false;
  const expected = Buffer.from(storedHash.slice(HASH_PREFIX.length), 'hex');
  const actual = createHash('sha256').update(secret).digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
