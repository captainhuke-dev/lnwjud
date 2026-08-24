import { randomUUID } from 'node:crypto';

/**
 * Task 2.2 — Execution ledger (Phase 2, doc §9–10).
 *
 * Device-side effectively-once guard: before invoking a tool on behalf of the
 * relay, the agent records the request; if the same request arrives again
 * (relay retry after a lost response), the cached result is returned instead
 * of executing a second time.
 *
 * Tools are classified by reconnect policy:
 *   READ               — safe to retry (but still deduped when committed)
 *   IDEMPOTENT_WRITE   — retry with the same key is harmless
 *   NON_IDEMPOTENT     — never replay automatically after execution started
 *   DESTRUCTIVE        — never auto-repeat; requires an execution receipt
 */

export type ToolPolicy = 'READ' | 'IDEMPOTENT_WRITE' | 'NON_IDEMPOTENT' | 'DESTRUCTIVE';

const TOOL_POLICY_MAP: Readonly<Record<string, ToolPolicy>> = Object.freeze({
  read_file: 'READ',
  read_files: 'READ',
  read_file_page: 'READ',
  search_files: 'READ',
  search_text: 'READ',
  list_dir: 'READ',
  git_status: 'READ',
  git_diff: 'READ',
  git_log: 'READ',

  write_file: 'IDEMPOTENT_WRITE',
  copy_file: 'IDEMPOTENT_WRITE',
  apply_patch: 'IDEMPOTENT_WRITE',

  move_file: 'NON_IDEMPOTENT',
  shell: 'NON_IDEMPOTENT',
  send_message: 'NON_IDEMPOTENT',

  delete_file: 'DESTRUCTIVE',
});

export function toolPolicyFor(name: string): ToolPolicy {
  return TOOL_POLICY_MAP[name] ?? 'NON_IDEMPOTENT';
}

export type LedgerState = 'STARTED' | 'COMMITTED';

export interface LedgerEntry {
  readonly requestId: string;
  readonly state: LedgerState;
  readonly policy: ToolPolicy;
  readonly resultPayload: string | null;
}

export class ExecutionLedger {
  private readonly entries = new Map<string, LedgerEntry>();
  private readonly maxEntries: number;

  public constructor(maxEntries = 1_000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Decide what to do with an incoming relayed request.
   * Returns the prior entry when this request was already seen:
   * - COMMITTED → return `resultPayload` to the relay (never re-execute)
   * - STARTED + NON_IDEMPOTENT/DESTRUCTIVE → refuse re-execution while in flight
   */
  public inspect(requestId: string, toolName: string): { replay: boolean; entry: LedgerEntry | null } {
    const existing = this.entries.get(requestId);
    if (existing === undefined) return { replay: false, entry: null };
    const policy = toolPolicyFor(toolName);
    if (existing.state === 'COMMITTED') return { replay: true, entry: existing };
    if ((policy === 'NON_IDEMPOTENT' || policy === 'DESTRUCTIVE') && existing.state === 'STARTED') {
      // Still executing and unsafe to run twice — treat as in-flight duplicate.
      return { replay: true, entry: existing };
    }
    return { replay: false, entry: existing };
  }

  public markStarted(requestId: string, toolName: string): LedgerEntry {
    const policy = toolPolicyFor(toolName);
    const entry: LedgerEntry = {
      requestId,
      state: 'STARTED',
      policy,
      resultPayload: null,
    };
    this.trim();
    this.entries.set(requestId, entry);
    return entry;
  }

  public commit(requestId: string, resultPayload: string): void {
    const existing = this.entries.get(requestId);
    if (existing === undefined) return;
    this.entries.set(requestId, { ...existing, state: 'COMMITTED', resultPayload });
  }

  private trim(): void {
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

/** Generate a fresh idempotency key for requests arriving without one. */
export function newLedgerKey(): string {
  return randomUUID();
}
