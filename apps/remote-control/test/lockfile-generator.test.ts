import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WS_VERSION = '8.21.3';
const WS_TYPES_VERSION = '8.18.1';
const CHUNK_SIZE = 20_000;

function runPnpm(repoRoot: string, arguments_: readonly string[]): void {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'corepack';
  const commandLine = `corepack pnpm@10.15.0 ${arguments_.join(' ')}`;
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', commandLine]
    : ['pnpm@10.15.0', ...arguments_];
  const generated = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });
  const failure = generated.error?.message ?? generated.stderr ?? generated.stdout;
  expect(generated.status, failure).toBe(0);
}

describe('remote-control ws lockfile generation probe', () => {
  it('emits the pnpm-generated repository lockfile for pinned websocket dependencies', async () => {
    const testDirectory = path.dirname(fileURLToPath(import.meta.url));
    const repoRoot = path.resolve(testDirectory, '../../..');

    runPnpm(repoRoot, [
      '--filter', '@lnwjud/remote-control',
      'add', `ws@${WS_VERSION}`,
      '--save-exact', '--lockfile-only', '--ignore-scripts',
    ]);
    runPnpm(repoRoot, [
      '--filter', '@lnwjud/remote-control',
      'add', '-D', `@types/ws@${WS_TYPES_VERSION}`,
      '--save-exact', '--lockfile-only', '--ignore-scripts',
    ]);

    const manifest = JSON.parse(
      await readFile(path.join(repoRoot, 'apps', 'remote-control', 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    expect(manifest.dependencies?.ws).toBe(WS_VERSION);
    expect(manifest.devDependencies?.['@types/ws']).toBe(WS_TYPES_VERSION);

    const lockfile = await readFile(path.join(repoRoot, 'pnpm-lock.yaml'), 'utf8');
    expect(lockfile).toContain('  apps/remote-control:');
    expect(lockfile).toContain(`specifier: ${WS_VERSION}`);
    expect(lockfile).toContain(`specifier: ${WS_TYPES_VERSION}`);
    expect(lockfile).toContain(`  ws@${WS_VERSION}:`);
    expect(lockfile).toContain(`  '@types/ws@${WS_TYPES_VERSION}':`);

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
