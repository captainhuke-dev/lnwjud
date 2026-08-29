import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnvironmentFile } from '../src/main/env-file.js';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function envFixture(contents: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-env-'));
  temporaryRoots.push(root);
  const file = path.join(root, '.env');
  await writeFile(file, contents, 'utf8');
  return file;
}

describe('desktop .env loader', () => {
  it('loads quoted values and removes inline comments without escaping Windows path separators', async () => {
    const file = await envFixture('LNWJUD_UNRESTRICTED="0"\nLNWJUD_CAPABILITY_EXTRA_ROOTS="Z:\\;Y:\\" # NAS roots\n');
    const environment: NodeJS.ProcessEnv = {};

    await loadEnvironmentFile(file, environment);

    expect(environment.LNWJUD_UNRESTRICTED).toBe('0');
    expect(environment.LNWJUD_CAPABILITY_EXTRA_ROOTS).toBe('Z:\\;Y:\\');
  });

  it('never overwrites an environment variable already supplied by the host', async () => {
    const file = await envFixture('LNWJUD_UNRESTRICTED=0\n');
    const environment: NodeJS.ProcessEnv = { LNWJUD_UNRESTRICTED: '1' };

    await loadEnvironmentFile(file, environment);

    expect(environment.LNWJUD_UNRESTRICTED).toBe('1');
  });
});
