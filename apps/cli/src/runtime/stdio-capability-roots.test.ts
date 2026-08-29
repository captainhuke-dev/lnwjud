import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { configuredStdioCapabilityRoots } from './stdio-capability-roots.js';

describe('stdio capability root configuration', () => {
  it('includes extra environment roots without enabling unrestricted mode', () => {
    const roots = configuredStdioCapabilityRoots({
      LNWJUD_CAPABILITY_ROOTS: 'C:\\work',
      LNWJUD_CAPABILITY_EXTRA_ROOTS: 'Z:\\nas;Y:\\media',
    }, ['D:\\settings']);

    expect(roots).toEqual([
      path.resolve('C:\\work'),
      path.resolve('Z:\\nas'),
      path.resolve('Y:\\media'),
      'D:\\settings',
    ]);
  });
});
