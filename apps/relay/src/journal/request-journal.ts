import { randomUUID } from 'node:crypto';
import type { SqliteDatabase } from '@lnwjud/storage';

/**
 * Task 1.5 — Request journal (Phase 1, doc §9–10).
 *
 * Every relayed MCP request is journaled so a retry after a broken connection
 * returns the committed result instead of re-executing the tool — the
 * effectively-once guarantee that keeps `delete_file()` from running twice.
 */

export type JournalState = 'RECEIVED' | 'STARTED' | 'RESULT_COMMITTED' | 'DELIVERED';

export interface JournalEntry {
  readonly requestId: string;
  readonly profileId: string;
  readonly state: JournalState;
  /** Present once RESULT_COMMITTED. */
  readonly resultPayload: string | null;
}

export class RequestJournal {
  public constructor(
    private readonly db: SqliteDatabase,
    private readonly retentionMs = 24 * 60 * 60 * 1_000,
  ) {}

  /**
   * Claim a request slot. Returns the prior entry when this request_id was
   * already journaled (replay candidate); null when newly claimed.
   */
  public claim(requestId: string, profileId: string): JournalEntry | null {
    const existing = this.get(requestId);
    if (existing !== null) return existing;
    const now = new Date().toISOString();
    db_insertClaim(this.db, requestId, profileId, now);
    return null;
  }

  /** Record that execution has started on the device. */
  public markStarted(requestId: string): void {
    this.db.connection
      .prepare("UPDATE request_journal SET state = 'STARTED', updated_at = ? WHERE request_id = ?")
      .run(new Date().toISOString(), requestId);
  }

  /**
   * Commit an executed result. From this point any replay of the same
   * request_id returns `resultPayload` and never re-dispatches.
   */
  public commitResult(requestId: string, resultPayload: string): void {
    this.db.connection
      .prepare("UPDATE request_journal SET state = 'RESULT_COMMITTED', result_payload = ?, updated_at = ? WHERE request_id = ?")
      .run(resultPayload, new Date().toISOString(), requestId);
  }

  /** Mark delivered to the AI client (terminal bookkeeping). */
  public markDelivered(requestId: string): void {
    this.db.connection
      .prepare("UPDATE request_journal SET state = 'DELIVERED', updated_at = ? WHERE request_id = ?")
      .run(new Date().toISOString(), requestId);
  }

  public get(requestId: string): JournalEntry | null {
    const row = this.db.connection
      .prepare('SELECT request_id, profile_id, state, result_payload FROM request_journal WHERE request_id = ?')
      .get(requestId) as Record<string, unknown> | undefined;
    if (row === undefined) return null;
    const state = String(row.state) as JournalState;
    return {
      requestId: String(row.request_id),
      profileId: String(row.profile_id),
      state,
      resultPayload: row.result_payload === null || row.result_payload === undefined ? null : String(row.result_payload),
    };
  }

  /** True when replay must short-circuit dispatch. */
  public hasCommittedResult(requestId: string): boolean {
    const entry = this.get(requestId);
    return entry !== null && (entry.state === 'RESULT_COMMITTED' || entry.state === 'DELIVERED');
  }

  /** Purge journal rows older than the retention window (ops housekeeping). */
  public purgeExpired(now: Date = new Date()): number {
    const cutoff = new Date(now.getTime() - this.retentionMs).toISOString();
    const result = this.db.connection
      .prepare('DELETE FROM request_journal WHERE updated_at < ?')
      .run(cutoff);
    return Number(result.changes);
  }
}

function db_insertClaim(db: SqliteDatabase, requestId: string, profileId: string, now: string): void {
  db.connection.prepare(`
    INSERT INTO request_journal (request_id, profile_id, state, result_payload, created_at, updated_at)
    VALUES (?, ?, 'RECEIVED', NULL, ?, ?)
    ON CONFLICT(request_id) DO NOTHING
  `).run(requestId, profileId, now, now);
}

/** Generate a relay-side idempotency key for requests arriving without one. */
export function newJournalId(): string {
  return randomUUID();
}
