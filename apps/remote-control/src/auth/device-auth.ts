import type { RemoteControlDatabase } from '../db.js';

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
  void db;
  void label;
  void now;
  throw new Error('REMOTE_CONTROL_DEVICE_AUTH_NOT_IMPLEMENTED');
}

export function redeemEnrollmentCode(
  db: RemoteControlDatabase,
  enrollmentId: string,
  code: string,
  now: Date,
): RedeemedDevice {
  void db;
  void enrollmentId;
  void code;
  void now;
  throw new Error('REMOTE_CONTROL_DEVICE_AUTH_NOT_IMPLEMENTED');
}

export function verifyDeviceToken(
  db: RemoteControlDatabase,
  deviceId: string,
  token: string,
): boolean {
  void db;
  void deviceId;
  void token;
  return false;
}

export function revokeDevice(db: RemoteControlDatabase, deviceId: string, now: Date): void {
  void db;
  void deviceId;
  void now;
  throw new Error('REMOTE_CONTROL_DEVICE_AUTH_NOT_IMPLEMENTED');
}
