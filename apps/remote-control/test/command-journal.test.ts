import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CommandJournal } from '../src/command-journal.js';
import { RemoteControlDatabase } from '../src/db.js';

const temporaryRoots: string[] = [];

async function createDatabasePath(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-remote-control-journal-'));
  temporaryRoots.push(root);
  return path.join(root, 'remote-control.sqlite');
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('remote-control server command journal', () => {
  it('claims a command id once and returns the original row for duplicates', async () => {
    const filename = await createDatabasePath();
    const db = new RemoteControlDatabase(filename);
    try {
      const journal = new CommandJournal(db);
      const first = journal.claim({
        commandId: 'command-1',
        deviceId: 'device-1',
        action: 'status.refresh',
        createdAt: '2026-08-29T11:00:00.000Z',
      });
      const duplicate = journal.claim({
        commandId: 'command-1',
        deviceId: 'device-2',
        action: 'desktop.restart',
        createdAt: '2026-08-29T11:00:01.000Z',
      });

      expect(duplicate).toEqual(first);
      expect(first).toMatchObject({
        commandId: 'command-1',
        deviceId: 'device-1',
        action: 'status.refresh',
        state: 'CLAIMED',
      });
      const count = db.connection.prepare(
        'SELECT COUNT(*) AS count FROM command_journal WHERE command_id = ?',
      ).get('command-1') as { count: number } | undefined;
      expect(count?.count).toBe(1);
    } finally {
      db.close();
    }
  });

  it('persists a committed result across database reopen', async () => {
    const filename = await createDatabasePath();
    const db = new RemoteControlDatabase(filename);
    const journal = new CommandJournal(db);
    journal.claim({
      commandId: 'command-2',
      deviceId: 'device-1',
      action: 'tunnel.status',
      createdAt: '2026-08-29T11:01:00.000Z',
    });
    journal.markAccepted('command-2', new Date('2026-08-29T11:01:01.000Z'));
    journal.commitResult(
      'command-2',
      { status: 'success', summary: 'Tunnel is healthy' },
      new Date('2026-08-29T11:01:02.000Z'),
    );
    db.close();

    const reopened = new RemoteControlDatabase(filename);
    try {
      expect(new CommandJournal(reopened).get('command-2')).toEqual({
        commandId: 'command-2',
        deviceId: 'device-1',
        action: 'tunnel.status',
        state: 'COMMITTED',
        result: { status: 'success', summary: 'Tunnel is healthy' },
        createdAt: '2026-08-29T11:01:00.000Z',
        updatedAt: '2026-08-29T11:01:02.000Z',
      });
    } finally {
      reopened.close();
    }
  });
});
