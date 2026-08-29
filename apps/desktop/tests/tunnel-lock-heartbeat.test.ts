import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  HEARTBEAT_STALE_MS,
  acquireTunnelLock,
  readTunnelLock,
  refreshTunnelLockHeartbeat,
  type TunnelLockOwner,
} from '../src/main/tunnel-lock.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function owner(pid: number, acquiredAt = '2026-08-20T00:00:00.000Z'): TunnelLockOwner {
  return { pid, processStartedAt: acquiredAt, acquiredAt };
}

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-lock-heartbeat-'));
  temporaryRoots.push(directory);
  return directory;
}

describe('tunnel lock heartbeat recovery', () => {
  it('reclaims a version-2 lock with a stale heartbeat when process liveness is unverifiable', async () => {
    const directory = await temporaryDirectory();
    const staleAt = new Date(Date.now() - HEARTBEAT_STALE_MS - 1_000).toISOString();
    await writeFile(path.join(directory, 'lnwjud.tunnel.lock'), JSON.stringify({
      version: 2,
      pid: 101,
      processStartedAt: '2026-08-20T00:00:00.000Z',
      acquiredAt: '2026-08-20T00:00:00.000Z',
      lastHeartbeatAt: staleAt,
    }), 'utf8');

    const claim = await acquireTunnelLock({
      profileDirectory: directory,
      owner: owner(202, '2026-08-20T00:02:00.000Z'),
      inspectProcess: async () => ({ state: 'unverifiable', reason: 'probe_timeout' }),
    });

    expect(claim.acquired).toBe(true);
    if (claim.acquired) await claim.release();
  });

  it('refreshes the heartbeat only while the caller still owns the lock', async () => {
    const directory = await temporaryDirectory();
    const lockOwner = owner(303, '2026-08-20T00:03:00.000Z');
    const claim = await acquireTunnelLock({
      profileDirectory: directory,
      owner: lockOwner,
      inspectProcess: async () => ({ state: 'live', processStartedAt: lockOwner.processStartedAt }),
    });
    expect(claim.acquired).toBe(true);

    await expect(refreshTunnelLockHeartbeat(directory, lockOwner)).resolves.toBe(true);
    expect((await readTunnelLock(directory))?.lastHeartbeatAt).toMatch(/Z$/);
    if (claim.acquired) await claim.release();
  });
});
