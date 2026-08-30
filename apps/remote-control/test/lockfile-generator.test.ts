import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WS_VERSION = '8.21.3';
const WS_TYPES_VERSION = '8.18.1';
const CHUNK_SIZE = 20_000;

function runCommand(repoRoot: string, executable: string, arguments_: readonly string[]): string {
  const generated = spawnSync(executable, arguments_, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });
  const failure = generated.error?.message ?? generated.stderr ?? generated.stdout;
  expect(generated.status, failure).toBe(0);
  return generated.stdout;
}

function runPnpm(repoRoot: string, arguments_: readonly string[]): void {
  if (process.platform === 'win32') {
    runCommand(repoRoot, 'cmd.exe', ['/d', '/s', '/c', `corepack pnpm@10.15.0 ${arguments_.join(' ')}`]);
    return;
  }
  runCommand(repoRoot, 'corepack', ['pnpm@10.15.0', ...arguments_]);
}

describe('remote-control ws lockfile generation probe', () => {
  it('emits the pnpm-generated repository lockfile for pinned websocket dependencies', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(testDirectory, '../../..');
    const manifestPath = path.join(repoRoot, 'apps', 'remote-control', 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    manifest.dependencies = { ws: WS_VERSION };
    manifest.devDependencies = { '@types/ws': WS_TYPES_VERSION };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

    runPnpm(repoRoot, ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts']);

    const lockfile = await readFile(path.join(repoRoot, 'pnpm-lock.yaml'), 'utf8');
    expect(lockfile).toContain('  apps/remote-control:');
    expect(lockfile).toContain(`specifier: ${WS_VERSION}`);
    expect(lockfile).toContain(`specifier: ${WS_TYPES_VERSION}`);
    expect(lockfile).toContain(`  ws@${WS_VERSION}:`);
    expect(lockfile).toContain(`  '@types/ws@${WS_TYPES_VERSION}':`);

    const gitDiff = runCommand(repoRoot, 'git', [
      'diff', '--', 'apps/remote-control/package.json', 'pnpm-lock.yaml',
    ]);
    console.log('LOCKFILE_DIFF_BEGIN');
    console.log(gitDiff);
    console.log('LOCKFILE_DIFF_END');

    const encoded = Buffer.from(lockfile, 'utf8').toString('base64');
    const digest = createHash('sha256').update(lockfile, 'utf8').digest('hex');
    console.log(`LOCKFILE_GENERATED_SHA256:${digest}`);
    console.log(`LOCKFILE_GENERATED_BYTES:${Buffer.byteLength(lockfile, 'utf8')}`);
    for (let offset = 0, index = 0; offset < encoded.length; offset += CHUNK_SIZE, index += 1) {
      const chunk = encoded.slice(offset, offset + CHUNK_SIZE);
      console.log(`LOCKFILE_BASE64_CHUNK:${String(index).padStart(4, '0')}:${chunk}`);
    }
    console.log('LOCKFILE_BASE64_END');

    throw new Error('LOCKFILE_GENERATION_CAPTURE_COMPLETE');
  });
});
