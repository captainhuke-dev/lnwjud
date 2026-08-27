import { describe, expect, it } from 'vitest';
import { matchesMachineRoot } from './machine-root-sync.js';

describe('machine-root synchronization', () => {
  it('recognizes a mapped drive already registered with a network real path', () => {
    expect(matchesMachineRoot({ rootPath: 'M:\\', realRootPath: '\\\\MCT-MAC5\\mac5\\' }, 'M:\\')).toBe(true);
  });
});
