import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteDatabase } from '@lnwjud/storage';
import { migrateRelaySchema } from '../src/db/schema.js';
import { RequestJournal } from '../src/journal/request-journal.js';

let directory: string;
let db: SqliteDatabase;
let journal: RequestJournal;
const PROFILE_ID = 'profile-test-0000-0000-000000000000';

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-relay-journal-'));
  db = new SqliteDatabase(path.join(directory, 'relay.sqlite'), {});
  migrateRelaySchema(db);
  // Journal rows FK-reference profiles; seed one for every test.
  const nowIso = new Date().toISOString();
  db.connection.prepare('INSERT INTO accounts (id, display_name, created_at) VALUES (?, ?, ?)')
    .run('account-' + PROFILE_ID.slice(0, 8), 'test', nowIso);
  db.connection.prepare(`INSERT INTO profiles (id, account_id, slug, display_name, public_mcp_url, catalog_version, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)`)
    .run(PROFILE_ID, 'account-' + PROFILE_ID.slice(0, 8), 'test-slug', 'Test', 'https://mcp.test/p/test', nowIso);
  journal = new RequestJournal(db);
});

afterEach(async () => {
  db.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(directory, { recursive: true, force: true }).catch(() => undefined);
});

describe('request journal', () => {
  it('claims a new request as RECEIVED with no result', () => {
    const prior = journal.claim('req-1', PROFILE_ID);
    expect(prior).toBeNull();
    const entry = journal.get('req-1');
    expect(entry?.state).toBe('RECEIVED');
    expect(entry?.resultPayload).toBeNull();
  });

  it('returns the existing entry when the same request_id is claimed again', () => {
    journal.claim('req-2', PROFILE_ID);
    const replay = journal.claim('req-2', PROFILE_ID);
    expect(replay?.state).toBe('RECEIVED');
  });

  it('walks the state machine RECEIVED → STARTED → RESULT_COMMITTED → DELIVERED', () => {
    journal.claim('req-3', PROFILE_ID);
    journal.markStarted('req-3');
    expect(journal.get('req-3')?.state).toBe('STARTED');
    journal.commitResult('req-3', '{"ok":true}');
    expect(journal.get('req-3')?.state).toBe('RESULT_COMMITTED');
    expect(journal.get('req-3')?.resultPayload).toBe('{"ok":true}');
    journal.markDelivered('req-3');
    expect(journal.get('req-3')?.state).toBe('DELIVERED');
    // Delivered + committed entries still satisfy hasCommittedResult for late replays.
    expect(journal.hasCommittedResult('req-3')).toBe(true);
  });

  it('hasCommittedResult is false until a result is committed', () => {
    journal.claim('req-4', PROFILE_ID);
    expect(journal.hasCommittedResult('req-4')).toBe(false);
    journal.markStarted('req-4');
    expect(journal.hasCommittedResult('req-4')).toBe(false);
    journal.commitResult('req-4', '{"ok":1}');
    expect(journal.hasCommittedResult('req-4')).toBe(true);
  });

  it('purges rows older than the retention window', async () => {
    journal.claim('req-old', PROFILE_ID);
    // Force the updated_at backwards so it looks old.
    db.connection.prepare("UPDATE request_journal SET updated_at = ? WHERE request_id = 'req-old'")
      .run(new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString());
    journal.claim('req-new', PROFILE_ID);
    const purged = journal.purgeExpired(new Date());
    expect(purged).toBe(1);
    expect(journal.get('req-old')).toBeNull();
    expect(journal.get('req-new')).not.toBeNull();
  });
});
