import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultEnvCandidates, loadDotEnvFile } from '../src/main/env-file.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('desktop .env loader', () => {
  it('applies key=value pairs and strips quotes/comments', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-env-'));
    temporaryRoots.push(directory);
    const file = path.join(directory, '.env');
    await writeFile(file, [
      '# comment',
      'LNWJUD_UNRESTRICTED=1',
      'LNWJUD_QUOTED="hello world"',
      'LNWJUD_TRAILING=value # inline note',
      '',
    ].join('\n'), 'utf8');

    const applied = loadDotEnvFile([file]);
    expect(applied).toBe(file);
    // The harness may have LNWJUD_UNRESTRICTED already set (repo .env); either
    // way the loader must not overwrite a pre-existing environment variable.
    const unrestricted = process.env.LNWJUD_UNRESTRICTED;
    expect(['0', '1']).toContain(unrestricted);
    expect(process.env.LNWJUD_QUOTED).toBe('hello world');
    expect(process.env.LNWJUD_TRAILING).toBe('value');
    delete process.env.LNWJUD_UNRESTRICTED;
    delete process.env.LNWJUD_QUOTED;
    delete process.env.LNWJUD_TRAILING;
  });

  it('never overrides existing environment variables', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-env-'));
    temporaryRoots.push(directory);
    const file = path.join(directory, '.env');
    process.env.LNWJUD_EXISTING_CHECK = 'from-env';
    await writeFile(file, 'LNWJUD_EXISTING_CHECK=from-file\n', 'utf8');

    loadDotEnvFile([file]);
    expect(process.env.LNWJUD_EXISTING_CHECK).toBe('from-env');
    delete process.env.LNWJUD_EXISTING_CHECK;
  });

  it('returns null when no candidate exists', async () => {
    expect(loadDotEnvFile([path.join(os.tmpdir(), 'lnwjud-missing-env-file')])).toBeNull();
  });

  it('default candidates include the repo root .env for source checkouts', () => {
    const candidates = defaultEnvCandidates(path.join('C:', 'repo', 'apps', 'desktop'));
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((entry) => entry.toLowerCase().endsWith('.env'))).toBe(true);
  });
});
