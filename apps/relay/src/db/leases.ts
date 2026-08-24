import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '@lnwjud/storage';

/**
 * Task 1.2 — lease bookkeeping (Phase 1).
 *
 * A lease proves a device is the active worker behind a profile. Every takeover
 * (first connect, reconnect after loss, manual switch) increments the epoch so
 * stale connections can be detected and rejected.
 */

export interface LeaseRow {
  readonly profileId: string;
  readonly deviceId: string;
  readonly connectionId: string;
  readonly epoch: number;
  readonly expiresAt: string;
  readonly lastHeartbeat: string;
}

const DEFAULT_LEASE_SECONDS = 15;

function isoNow(): string {
  return new Date().toISOString().replace(/\.(\d{3})\d*Z$/, '.$1Z');
}

export function acquireLease(
  db: SqliteDatabase,
  profileId: string,
  deviceId: string,
  options?: { leaseSeconds?: number; now?: Date },
): LeaseRow {
  const now = options?.now ?? new Date();
  const seconds = options?.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const expiresAt = new Date(now.getTime() + seconds * 1_000).toISOString();
  const lastHeartbeat = now.toISOString();
  const existing = db.connection
    .prepare('SELECT epoch FROM leases WHERE profile_id = ?')
    .get(profileId) as { epoch: number } | undefined;
  const epoch = (existing?.epoch ?? 0) + 1;
  const connectionId = randomUUID();
  db.connection.prepare(`
    INSERT INTO leases (profile_id, device_id, connection_id, epoch, expires_at, last_heartbeat)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      device_id = excluded.device_id,
      connection_id = excluded.connection_id,
      epoch = excluded.epoch,
      expires_at = excluded.expires_at,
      last_heartbeat = excluded.last_heartbeat
  `).run(profileId, deviceId, connectionId, epoch, expiresAt, lastHeartbeat);
  return { profileId, deviceId, connectionId, epoch, expiresAt, lastHeartbeat };
}

/** Refresh the heartbeat + expiry of an unexpired lease held by the given device. */
export function renewLease(
  db: SqliteDatabase,
  profileId: string,
  deviceId: string,
  options?: { leaseSeconds?: number; now?: Date },
): LeaseRow | null {
  const now = options?.now ?? new Date();
  const seconds = options?.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const row = db.connection
    .prepare('SELECT device_id, connection_id, epoch, expires_at FROM leases WHERE profile_id = ?')
    .get(profileId) as { device_id: string; connection_id: string; epoch: number; expires_at: string } | undefined;
  if (row === undefined || row.device_id !== deviceId) return null;
  // An already-expired lease cannot be renewed — the device must re-acquire
  // (which increments the epoch and signals a fresh takeover).
  if (new Date(row.expires_at).getTime() <= now.getTime()) return null;
  const expiresAt = new Date(now.getTime() + seconds * 1_000).toISOString();
  db.connection.prepare('UPDATE leases SET expires_at = ?, last_heartbeat = ? WHERE profile_id = ?')
    .run(expiresAt, now.toISOString(), profileId);
  return {
    profileId,
    deviceId: row.device_id,
    connectionId: row.connection_id,
    epoch: row.epoch,
    expiresAt,
    lastHeartbeat: now.toISOString(),
  };
}

/** Release the lease on graceful disconnect; the next connect starts a new epoch. */
export function releaseLease(db: SqliteDatabase, profileId: string, deviceId: string): boolean {
  const result = db.connection
    .prepare("DELETE FROM leases WHERE profile_id = ? AND device_id = ?")
    .run(profileId, deviceId);
  return Number(result.changes) > 0;
}

export function getActiveLease(db: SqliteDatabase, profileId: string, now: Date = new Date()): LeaseRow | null {
  const row = db.connection
    .prepare('SELECT profile_id, device_id, connection_id, epoch, expires_at, last_heartbeat FROM leases WHERE profile_id = ?')
    .get(profileId) as Record<string, unknown> | undefined;
  if (row === undefined) return null;
  if (new Date(String(row.expires_at)).getTime() < now.getTime()) return null;
  return {
    profileId: String(row.profile_id),
    deviceId: String(row.device_id),
    connectionId: String(row.connection_id),
    epoch: Number(row.epoch),
    expiresAt: String(row.expires_at),
    lastHeartbeat: String(row.last_heartbeat),
  };
}
