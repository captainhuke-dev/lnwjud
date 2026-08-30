import { DatabaseSync } from 'node:sqlite';

const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS remote_control_schema_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY NOT NULL,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS enrollments (
  enrollment_id TEXT PRIMARY KEY NOT NULL,
  secret_hash TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS command_journal (
  command_id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state TEXT NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT NOT NULL,
  device_id TEXT,
  command_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

export class RemoteControlDatabase {
  public readonly connection: DatabaseSync;

  public constructor(filename: string) {
    this.connection = new DatabaseSync(filename, { timeout: 5_000 });
    this.connection.exec('PRAGMA journal_mode = WAL;');
    this.connection.exec('PRAGMA busy_timeout = 5000;');
    this.connection.exec('PRAGMA foreign_keys = ON;');
    this.connection.exec(INITIAL_SCHEMA);
    this.connection
      .prepare('INSERT OR IGNORE INTO remote_control_schema_migrations (id, applied_at) VALUES (?, ?)')
      .run('001_initial', new Date().toISOString());
  }

  public close(): void {
    this.connection.close();
  }
}
