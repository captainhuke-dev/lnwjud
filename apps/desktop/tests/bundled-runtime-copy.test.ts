import { describe, expect, it } from 'vitest';
import { copyBundledRuntime } from '../scripts/bundled-runtime-copy.mjs';

describe('bundled runtime copy', () => {
  it('keeps an existing bundled runtime when Windows reports a lock error', () => {
    let warning = '';
    const locked = Object.assign(new Error('locked'), { code: 'EBUSY' });

    expect(() => copyBundledRuntime('C:/node.exe', 'C:/build/lnwjud-node.exe', {
      copyFile: () => { throw locked; },
      exists: () => true,
      warn: (message: string) => { warning = message; },
    })).not.toThrow();
    expect(warning).toContain('EBUSY');
  });

  it('rethrows a lock error when there is no existing runtime to reuse', () => {
    const locked = Object.assign(new Error('locked'), { code: 'EPERM' });

    expect(() => copyBundledRuntime('C:/node.exe', 'C:/build/lnwjud-node.exe', {
      copyFile: () => { throw locked; },
      exists: () => false,
      warn: () => undefined,
    })).toThrow(locked);
  });
});
