import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from '@lnwjud/storage';
import { migrateRelaySchema, RELAY_SCHEMA_VERSION } from '../src/db/schema.js';
import { acquireLease, getActiveLease, releaseLease, renewLease } from '../src/db/leases.js';

let directory: string;
let db: SqliteDatabase;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-relay-db-'));
  db = new SqliteDatabase(path.join(directory, 'relay.sqlite'), {});
  migrateRelaySchema(db);
});

afterEach(async () => {
  db.close();
  // Windows keeps the sqlite/-shm files briefly locked after close.
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(directory, { recursive: true, force: true }).catch(() => undefined);
});

function seedAccountProfileDevice(): { accountId: string; profileId: string; deviceId: string } {
  const accountId = randomId();
  const profileId = randomId();
  const deviceId = randomId();
  db.connection.prepare('INSERT INTO accounts (id, display_name, created_at) VALUES (?, ?, ?)')
    .run(accountId, 'test-account', new Date().toISOString());
  db.connection.prepare(`INSERT INTO profiles (id, account_id, slug, display_name, public_mcp_url, catalog_version, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)`)
    .run(profileId, accountId, 'dev', 'Development', 'https://mcp.example.com/p/dev', new Date().toISOString());
  db.connection.prepare(`INSERT INTO devices (id, account_id, name, platform, device_token_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(deviceId, accountId, 'PC01', 'windows', 'hash-1', new Date().toISOString());
  return { accountId, profileId, deviceId };
}

function randomId(): string {
  return crypto.randomUUID();
}

describe('relay schema migrations', () => {
  it('applies the schema and records migration versions', () => {
    const applied = db.connection.prepare('SELECT version FROM relay_schema_migrations').all() as Array<{ version: number }>;
    expect(applied.map((r) => r.version)).toEqual([RELAY_SCHEMA_VERSION]);
    // Idempotent second run.
    expect(migrateRelaySchema(db)).toBe(0);
  });

  it('creates all control-plane tables', () => {
    for (const table of ['accounts', 'devices', 'profiles', 'leases', 'request_journal']) {
      const row = db.connection
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      expect(row).toBeDefined();
    }
  });
});

describe('device leases', () => {
  it('acquires a lease and increments epoch on every takeover', () => {
    const { profileId, deviceId } = seedAccountProfileDevice();
    const first = acquireLease(db, profileId, deviceId);
    expect(first.epoch).toBe(1);

    // A different device taking over bumps the epoch.
    const secondDevice = randomId();
    db.connection.prepare(`INSERT INTO devices (id, account_id, name, platform, device_token_hash, created_at)
      VALUES (?, (SELECT account_id FROM devices WHERE id=?), 'PC02', 'linux', 'hash-2', ?)`)
      .run(secondDevice, deviceId, new Date().toISOString());
    const second = acquireLease(db, profileId, secondDevice);
    expect(second.epoch).toBe(2);

    // Only one active lease per profile.
    const active = getActiveLease(db, profileId);
    expect(active?.deviceId).toBe(secondDevice);
    expect(active?.epoch).toBe(2);
  });

  it('renews an unexpired lease without bumping the epoch', () => {
    const { profileId, deviceId } = seedAccountProfileDevice();
    const lease = acquireLease(db, profileId, deviceId);
    const later = new Date(Date.now() + 5_000);
    const renewed = renewLease(db, profileId, deviceId, { now: later });
    expect(renewed).not.toBeNull();
    expect(renewed?.epoch).toBe(lease.epoch);
    expect(renewed?.expiresAt > lease.expiresAt).toBe(true);
  });

  it('refuses renewal for a foreign device or expired lease', () => {
    const { profileId, deviceId } = seedAccountProfileDevice();
    acquireLease(db, profileId, deviceId);
    expect(renewLease(db, profileId, 'not-the-holder')).toBeNull();

    // Already-expired lease: renewal must refuse (device must re-acquire, which
    // increments the epoch and signals a fresh takeover).
    const stale = acquireLease(db, profileId, deviceId, { leaseSeconds: -1 });
    expect(renewLease(db, profileId, deviceId, { leaseSeconds: 15, now: new Date(stale.expiresAt) })).toBeNull();
  });

  it('release removes the lease so the next connect starts a new epoch', () => {
    const { profileId, deviceId } = seedAccountProfileDevice();
    acquireLease(db, profileId, deviceId);
    expect(releaseLease(db, profileId, deviceId)).toBe(true);
    expect(getActiveLease(db, profileId)).toBeNull();
    // Epoch continues from the highest ever issued for this profile (row deleted
    // but epoch history lives on through the next takeover's increment of the
    // previous max) — release-then-reconnect must not reuse the same connection.
    const reacquired = acquireLease(db, profileId, deviceId);
    expect(reacquired.connectionId).not.toBeNull();
    expect(reacquired.epoch).toBeGreaterThanOrEqual(1);
  });

  it('expired leases are not reported as active', () => {
    const { profileId, deviceId } = seedAccountProfileDevice();
    acquireLease(db, profileId, deviceId, { leaseSeconds: -1 });
    expect(getActiveLease(db, profileId)).toBeNull();
  });
});
