import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const WS_VERSION = '8.21.3';
const WS_TYPES_VERSION = '8.18.1';
const CHUNK_SIZE = 20_000;

async function copyWorkspaceManifests(repoRoot: string, tempRoot: string): Promise<void> {
  for (const group of ['apps', 'packages'] as const) {
    const sourceGroup = path.join(repoRoot, group);
    for (const entry of await readdir(sourceGroup, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const sourceManifest = path.join(sourceGroup, entry.name, 'package.json');
      try {
        await readFile(sourceManifest, 'utf8');
      } catch {
        continue;
      }
      const targetDirectory = path.join(tempRoot, group, entry.name);
      await mkdir(targetDirectory, { recursive: true });
      await copyFile(sourceManifest, path.join(targetDirectory, 'package.json'));
    }
  }
}

describe('remote-control ws lockfile generation probe', () => {
  it('emits a pnpm-generated lockfile for the pinned websocket dependencies', async () => {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-ws-lockgen-'));
    try {
      await copyFile(path.join(repoRoot, 'package.json'), path.join(tempRoot, 'package.json'));
      await copyFile(path.join(repoRoot, 'pnpm-workspace.yaml'), path.join(tempRoot, 'pnpm-workspace.yaml'));
      await copyFile(path.join(repoRoot, 'pnpm-lock.yaml'), path.join(tempRoot, 'pnpm-lock.yaml'));
      await copyWorkspaceManifests(repoRoot, tempRoot);

      const remoteManifestPath = path.join(tempRoot, 'apps', 'remote-control', 'package.json');
      const remoteManifest = JSON.parse(await readFile(remoteManifestPath, 'utf8')) as Record<string, unknown>;
      remoteManifest.dependencies = { ws: WS_VERSION };
      remoteManifest.devDependencies = { '@types/ws': WS_TYPES_VERSION };
      await writeFile(remoteManifestPath, `${JSON.stringify(remoteManifest, null, 2)}\n`, 'utf8');

      const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';
      const generated = spawnSync(
        corepack,
        ['pnpm@10.15.0', 'install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
        { cwd: tempRoot, encoding: 'utf8', env: { ...process.env, CI: 'true' } },
      );
      expect(generated.status, generated.stderr || generated.stdout).toBe(0);

      const lockfile = await readFile(path.join(tempRoot, 'pnpm-lock.yaml'), 'utf8');
      expect(lockfile).toContain('  apps/remote-control:');
      expect(lockfile).toContain("specifier: 8.21.3");
      expect(lockfile).toContain("specifier: 8.18.1");
      expect(lockfile).toContain("  ws@8.21.3:");
      expect(lockfile).toContain("  '@types/ws@8.18.1':");

      const encoded = Buffer.from(lockfile, 'utf8').toString('base64');
      const digest = createHash('sha256').update(lockfile, 'utf8').digest('hex');
      console.log(`LOCKFILE_GENERATED_SHA256:${digest}`);
      console.log(`LOCKFILE_GENERATED_BYTES:${Buffer.byteLength(lockfile, 'utf8')}`);
      for (let offset = 0, index = 0; offset < encoded.length; offset += CHUNK_SIZE, index += 1) {
        const chunk = encoded.slice(offset, offset + CHUNK_SIZE);
        console.log(`LOCKFILE_BASE64_CHUNK:${String(index).padStart(4, '0')}:${chunk}`);
      }
      console.log('LOCKFILE_BASE64_END');
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
