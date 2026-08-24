import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from '@lnwjud/storage';
import { migrateRelaySchema, RELAY_SCHEMA_VERSION } from '../src/db/schema.js';
import { CatalogService, computeCatalogHash } from '../src/catalog/catalog-service.js';

let directory: string;
let db: SqliteDatabase;
let catalog: CatalogService;
let profileId: string;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-relay-catalog-'));
  db = new SqliteDatabase(path.join(directory, 'relay.sqlite'), {});
  migrateRelaySchema(db);
  const nowIso = new Date().toISOString();
  const accountId = crypto.randomUUID();
  profileId = crypto.randomUUID();
  db.connection.prepare('INSERT INTO accounts (id, display_name, created_at) VALUES (?, ?, ?)')
    .run(accountId, 'test', nowIso);
  db.connection.prepare(`INSERT INTO profiles (id, account_id, slug, display_name, public_mcp_url, catalog_version, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)`)
    .run(profileId, accountId, 'dev', 'Development', 'https://mcp.test/p/dev', nowIso);
  catalog = new CatalogService(db);
});

afterEach(async () => {
  db.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(directory, { recursive: true, force: true }).catch(() => undefined);
});

const TOOLS_V1 = [{ name: 'read_file', description: 'Read a file' }];
const TOOLS_V2 = [
  { name: 'read_file', description: 'Read a file' },
  { name: 'write_file', description: 'Write a file' },
];

describe('versioned tool catalog', () => {
  it('publishes an initial catalog and bumps version on change', () => {
    expect(catalog.publish(profileId, TOOLS_V1)).toBe('INITIAL');
    let snapshot = catalog.get(profileId);
    expect(snapshot?.version).toBe(1);
    expect(snapshot?.hash).toBe(computeCatalogHash(TOOLS_V1));
    expect(snapshot?.tools).toEqual(TOOLS_V1);

    expect(catalog.publish(profileId, TOOLS_V2)).toBe('UPDATED');
    snapshot = catalog.get(profileId);
    expect(snapshot?.version).toBe(2);
    expect(snapshot?.tools.length).toBe(2);
  });

  it('reports NO_CHANGE when the hash matches the stored catalog', () => {
    catalog.publish(profileId, TOOLS_V1);
    const sameHashHint = computeCatalogHash(TOOLS_V1);
    // Republish with identical tools (hash derived) → no version bump.
    expect(catalog.publish(profileId, [...TOOLS_V1])).toBe('NO_CHANGE');
    expect(catalog.get(profileId)?.version).toBe(1);
    void sameHashHint;
  });

  it('serves the cached catalog offline (canServeOffline)', () => {
    expect(catalog.canServeOffline(profileId)).toBe(false);
    catalog.publish(profileId, TOOLS_V1);
    expect(catalog.canServeOffline(profileId)).toBe(true);
  });

  it('schema includes the new table at the same migration version', () => {
    const applied = db.connection.prepare('SELECT version FROM relay_schema_migrations').all() as Array<{ version: number }>;
    expect(applied.map((r) => r.version)).toEqual([RELAY_SCHEMA_VERSION]);
    const row = db.connection
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='profile_catalogs'")
      .get();
    expect(row).toBeDefined();
  });
});
