import type { DatabaseSync } from 'node:sqlite';

export class RemoteControlDatabase {
  public readonly connection!: DatabaseSync;

  public constructor(filename: string) {
    void filename;
    throw new Error('REMOTE_CONTROL_DATABASE_NOT_IMPLEMENTED');
  }

  public close(): void {
    throw new Error('REMOTE_CONTROL_DATABASE_NOT_IMPLEMENTED');
  }
}
