import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const helperPath = path.resolve('../..', 'scripts/lib/lnwjud-tunnel-lock.ps1');
const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-ps-heartbeat-'));
  temporaryRoots.push(directory);
  return directory;
}

function quotePowerShell(value: string): string {
  return value.replaceAll("'", "''");
}

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  return stdout.trim();
}

describe('PowerShell tunnel lock heartbeat compatibility', () => {
  it('accepts a fresh v2 record and still fails closed when owner liveness is unverifiable', async () => {
    const root = await temporaryDirectory();
    const lockPath = path.join(root, 'lnwjud.tunnel.lock');
    const now = new Date().toISOString();
    const existing = {
      version: 2,
      pid: 77,
      processStartedAt: '2026-08-20T00:00:00.000Z',
      acquiredAt: '2026-08-20T00:00:00.000Z',
      lastHeartbeatAt: now,
    };
    await writeFile(lockPath, JSON.stringify(existing), 'utf8');

    const output = await runPowerShell(`
      . '${quotePowerShell(helperPath)}'
      try {
        Enter-LnwjudTunnelLock -ProfileDir '${quotePowerShell(root)}' -OwnerPid 88 -OwnerStartedAt '2026-08-20T00:01:00.000Z' -ProcessStartProvider { param($id) [pscustomobject]@{state='unverifiable';reason='probe_timeout'} } | Out-Null
        'UNEXPECTED_ACQUIRE'
      } catch {
        $_.Exception.Message
      }
    `);

    expect(output).toContain('owner liveness is unverifiable: probe_timeout');
    expect(JSON.parse(await readFile(lockPath, 'utf8'))).toEqual(existing);
  });

  it('reclaims stale v2 heartbeat when liveness is unverifiable but keeps a non-heartbeating PowerShell owner on schema v1', async () => {
    const root = await temporaryDirectory();
    const lockPath = path.join(root, 'lnwjud.tunnel.lock');
    const staleHeartbeat = new Date(Date.now() - 91_000).toISOString();
    await writeFile(lockPath, JSON.stringify({
      version: 2,
      pid: 77,
      processStartedAt: '2026-08-20T00:00:00.000Z',
      acquiredAt: '2026-08-20T00:00:00.000Z',
      lastHeartbeatAt: staleHeartbeat,
    }), 'utf8');

    const output = await runPowerShell(`
      . '${quotePowerShell(helperPath)}'
      $claim = Enter-LnwjudTunnelLock -ProfileDir '${quotePowerShell(root)}' -OwnerPid 88 -OwnerStartedAt '2026-08-20T00:01:00.000Z' -ProcessStartProvider { param($id) [pscustomobject]@{state='unverifiable';reason='probe_timeout'} }
      $claim | ConvertTo-Json -Compress
    `);

    expect(JSON.parse(output)).toMatchObject({ acquired: true, owner: { pid: 88 } });
    const published = JSON.parse(await readFile(lockPath, 'utf8')) as Record<string, unknown>;
    expect(published).toMatchObject({ version: 1, pid: 88 });
    expect(published).not.toHaveProperty('lastHeartbeatAt');
  });
});
