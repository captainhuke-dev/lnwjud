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

export class CommandJournal {
  public constructor(db: RemoteControlDatabase) {
    void db;
  }

  public claim(command: CommandJournalInput): CommandJournalEntry {
    void command;
    throw new Error('REMOTE_CONTROL_COMMAND_JOURNAL_NOT_IMPLEMENTED');
  }

  public markAccepted(commandId: string, at: Date): CommandJournalEntry {
    void commandId;
    void at;
    throw new Error('REMOTE_CONTROL_COMMAND_JOURNAL_NOT_IMPLEMENTED');
  }

  public commitResult(commandId: string, result: unknown, at: Date): CommandJournalEntry {
    void commandId;
    void result;
    void at;
    throw new Error('REMOTE_CONTROL_COMMAND_JOURNAL_NOT_IMPLEMENTED');
  }

  public get(commandId: string): CommandJournalEntry | undefined {
    void commandId;
    return undefined;
  }
}
