// Task Extent-V1.1.0 (Task 1.3): standalone tunnel-lock recovery CLI.
// Usage: node lnwjud-recover-lock.cjs [--profile-dir <dir>] [--force]
// Safe by default — a live lock owner is never removed; unverifiable owners
// require --force. Bundled by the desktop build next to lnwjud-mcp-stdio.cjs.
import path from 'node:path';
import { recoverTunnelLock } from './tunnel-lock.js';

const readArg = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};
const hasFlag = (flag: string): boolean => process.argv.includes(flag);

async function main(): Promise<void> {
  const profileDirectory = readArg('--profile-dir')
    ?? path.join(process.env.APPDATA ?? process.cwd(), 'tunnel-client');

  const recovery = await recoverTunnelLock(profileDirectory, { force: hasFlag('--force') });
  process.stdout.write(`lnwjud tunnel lock recover: ${recovery.outcome}`
    + `${recovery.owner === null ? '' : ` (pid ${recovery.owner.pid}, acquired ${recovery.owner.acquiredAt})`}`
    + ` [profile: ${profileDirectory}]\n`);
  if (recovery.outcome === 'unverifiable') {
    process.stderr.write('lnwjud tunnel lock recover: owner liveness could not be verified; re-run with --force to remove anyway\n');
    process.exit(2);
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`lnwjud recover-lock failed: ${error instanceof Error ? error.message : 'unknown'}\n`);
  process.exit(1);
});
