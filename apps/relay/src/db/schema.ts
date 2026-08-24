import type { SqliteDatabase } from '@lnwjud/storage';

/**
 * Task 1.2 — Relay control-plane schema (Phase 1, Persistent MCP Profile Relay).
 *
 * The relay stores only control-plane state: identities, routing metadata and
 * lease bookkeeping. No source code, command contents or file data ever land
 * here.
 */
export const RELAY_SCHEMA_VERSION = 1;

interface Migration {
  readonly version: number;
  readonly up: (db: SqliteDatabase) => void;
}

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: (db): void => {
      db.connection.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY NOT NULL,
          display_name TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          platform TEXT NOT NULL,
          device_token_hash TEXT NOT NULL UNIQUE,
          last_seen_at TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_devices_account ON devices(account_id);

        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY NOT NULL,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          slug TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          public_mcp_url TEXT NOT NULL,
          catalog_version INTEGER NOT NULL DEFAULT 0,
          catalog_hash TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_profiles_account ON profiles(account_id);

        CREATE TABLE IF NOT EXISTS leases (
          profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
          device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          connection_id TEXT NOT NULL,
          epoch INTEGER NOT NULL,
          expires_at TEXT NOT NULL,
          last_heartbeat TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_leases_device ON leases(device_id);

        CREATE TABLE IF NOT EXISTS request_journal (
          request_id TEXT PRIMARY KEY NOT NULL,
          profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          state TEXT NOT NULL CHECK (state IN ('RECEIVED','STARTED','RESULT_COMMITTED','DELIVERED')),
          result_payload TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_journal_profile ON request_journal(profile_id);

        CREATE TABLE IF NOT EXISTS profile_catalogs (
          profile_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
          tools_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oauth_codes (
          id TEXT PRIMARY KEY NOT NULL,
          code_hash TEXT NOT NULL UNIQUE,
          client_id TEXT NOT NULL,
          redirect_uri TEXT NOT NULL,
          scope TEXT NOT NULL DEFAULT 'mcp',
          code_challenge TEXT NOT NULL,
          code_created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS oauth_tokens (
          token_hash TEXT PRIMARY KEY NOT NULL,
          client_id TEXT NOT NULL,
          scope TEXT NOT NULL DEFAULT 'mcp',
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client ON oauth_tokens(client_id);
      `);
    },
  },
];

/** Apply pending migrations in order; idempotent. */
export function migrateRelaySchema(db: SqliteDatabase): number {
  db.connection.exec(`
    CREATE TABLE IF NOT EXISTS relay_schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const applied = new Set(
    db.connection.prepare('SELECT version FROM relay_schema_migrations').all()
      .map((row) => Number((row as { version: number }).version)),
  );
  let count = 0;
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    migration.up(db);
    db.connection.prepare('INSERT INTO relay_schema_migrations (version, applied_at) VALUES (?, ?)')
      .run(migration.version, new Date().toISOString());
    count += 1;
  }
  return count;
}
