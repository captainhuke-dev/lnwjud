import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RemoteControlDatabase } from '../src/db.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('RemoteControlDatabase', () => {
  it('creates only dedicated remote-control tables and uses WAL mode', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-db-'));
    temporaryRoots.push(root);
    const db = new RemoteControlDatabase(path.join(root, 'remote-control.sqlite'));

    const rows = db.connection
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as Array<{ name: string }>;
    expect(rows.map((row) => row.name)).toEqual([
      'audit_events',
      'command_journal',
      'devices',
      'enrollments',
      'remote_control_schema_migrations',
    ]);

    const mode = db.connection.prepare('PRAGMA journal_mode;').get() as { journal_mode?: string } | undefined;
    expect(mode?.journal_mode?.toLowerCase()).toBe('wal');
    db.close();
  });
});
