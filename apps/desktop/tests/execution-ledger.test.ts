import { describe, expect, it } from 'vitest';
import { ExecutionLedger, toolPolicyFor } from '../src/main/execution-ledger.js';

describe('tool policy classification', () => {
  it('classifies known tools per the reconnect policy table', () => {
    expect(toolPolicyFor('read_file')).toBe('READ');
    expect(toolPolicyFor('git_status')).toBe('READ');
    expect(toolPolicyFor('write_file')).toBe('IDEMPOTENT_WRITE');
    expect(toolPolicyFor('shell')).toBe('NON_IDEMPOTENT');
    expect(toolPolicyFor('delete_file')).toBe('DESTRUCTIVE');
    // Unknown tools default to the safe side.
    expect(toolPolicyFor('mystery_tool')).toBe('NON_IDEMPOTENT');
  });
});

describe('execution ledger', () => {
  it('marks started and commits results for new requests', () => {
    const ledger = new ExecutionLedger();
    const check = ledger.inspect('req-1', 'read_file');
    expect(check.replay).toBe(false);
    ledger.markStarted('req-1', 'read_file');
    ledger.commit('req-1', '{"content":"data"}');
    const replay = ledger.inspect('req-1', 'read_file');
    expect(replay.replay).toBe(true);
    expect(replay.entry?.resultPayload).toBe('{"content":"data"}');
  });

  it('refuses duplicate in-flight execution of destructive tools', () => {
    const ledger = new ExecutionLedger();
    ledger.markStarted('req-del', 'delete_file'); // STARTED, not committed
    const check = ledger.inspect('req-del', 'delete_file');
    // In-flight destructive duplicate → treated as replay (no result yet).
    expect(check.replay).toBe(true);
    expect(check.entry?.resultPayload).toBeNull();
    expect(check.entry?.policy).toBe('DESTRUCTIVE');
  });

  it('allows re-dispatch of READ tools that never committed (lost request)', () => {
    // A READ request that was never executed (no STARTED record) is not a replay.
    const ledger = new ExecutionLedger();
    expect(ledger.inspect('req-unknown', 'read_file').replay).toBe(false);
  });

  it('trims to maxEntries so the ledger cannot grow unbounded', () => {
    const ledger = new ExecutionLedger(3);
    for (let i = 0; i < 5; i += 1) {
      ledger.markStarted(`req-${i}`, 'read_file');
      ledger.commit(`req-${i}`, '{}');
    }
    // Oldest entries evicted; the newest survive.
    expect(ledger.inspect('req-0', 'read_file').replay).toBe(false);
    expect(ledger.inspect('req-4', 'read_file').replay).toBe(true);
  });

  it('commit without start is a no-op', () => {
    const ledger = new ExecutionLedger();
    ledger.commit('ghost', '{}');
    expect(ledger.inspect('ghost', 'read_file').replay).toBe(false);
  });
});
