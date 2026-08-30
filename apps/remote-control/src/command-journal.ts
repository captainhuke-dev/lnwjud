import type { RemoteControlDatabase } from './db.js';

export type CommandJournalState = 'CLAIMED' | 'ACCEPTED' | 'COMMITTED';

export interface CommandJournalInput {
  readonly commandId: string;
  readonly deviceId: string;
  readonly action: string;
  readonly createdAt: string;
}

export interface CommandJournalEntry extends CommandJournalInput {
  readonly state: CommandJournalState;
  readonly result: unknown | null;
  readonly updatedAt: string;
}

interface CommandJournalRow {
  readonly command_id: string;
  readonly device_id: string;
  readonly action: string;
  readonly state: string;
  readonly result_json: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export class CommandJournal {
  public constructor(private readonly db: RemoteControlDatabase) {}

  public claim(command: CommandJournalInput): CommandJournalEntry {
    this.db.connection.prepare(`
      INSERT OR IGNORE INTO command_journal (
        command_id, device_id, action, state, result_json, created_at, updated_at
      ) VALUES (?, ?, ?, 'CLAIMED', NULL, ?, ?)
    `).run(command.commandId, command.deviceId, command.action, command.createdAt, command.createdAt);
    return this.requireEntry(command.commandId);
  }

  public markAccepted(commandId: string, at: Date): CommandJournalEntry {
    const existing = this.requireEntry(commandId);
    if (existing.state !== 'CLAIMED') return existing;

    this.db.connection.prepare(`
      UPDATE command_journal
      SET state = 'ACCEPTED', updated_at = ?
      WHERE command_id = ? AND state = 'CLAIMED'
    `).run(at.toISOString(), commandId);
    return this.requireEntry(commandId);
  }

  public commitResult(commandId: string, result: unknown, at: Date): CommandJournalEntry {
    const existing = this.requireEntry(commandId);
    if (existing.state === 'COMMITTED') return existing;
    if (existing.state !== 'ACCEPTED') {
      throw new Error('Remote command result may be committed only after acceptance');
    }

    const serialized = JSON.stringify(result);
    if (serialized === undefined) throw new Error('Remote command result must be JSON serializable');
    this.db.connection.prepare(`
      UPDATE command_journal
      SET state = 'COMMITTED', result_json = ?, updated_at = ?
      WHERE command_id = ? AND state = 'ACCEPTED'
    `).run(serialized, at.toISOString(), commandId);
    return this.requireEntry(commandId);
  }

  public get(commandId: string): CommandJournalEntry | undefined {
    const row = this.db.connection.prepare(`
      SELECT command_id, device_id, action, state, result_json, created_at, updated_at
      FROM command_journal
      WHERE command_id = ?
    `).get(commandId) as CommandJournalRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  private requireEntry(commandId: string): CommandJournalEntry {
    const entry = this.get(commandId);
    if (!entry) throw new Error(`Remote command journal entry not found: ${commandId}`);
    return entry;
  }
}

function mapRow(row: CommandJournalRow): CommandJournalEntry {
  if (!isCommandJournalState(row.state)) {
    throw new Error(`Remote command journal has invalid state: ${row.state}`);
  }
  return {
    commandId: row.command_id,
    deviceId: row.device_id,
    action: row.action,
    state: row.state,
    result: parseResult(row.result_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCommandJournalState(value: string): value is CommandJournalState {
  return value === 'CLAIMED' || value === 'ACCEPTED' || value === 'COMMITTED';
}

function parseResult(serialized: string | null): unknown | null {
  if (serialized === null) return null;
  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    throw new Error('Remote command journal contains invalid result JSON');
  }
}
