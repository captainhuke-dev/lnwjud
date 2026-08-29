import { copyFileSync, existsSync } from 'node:fs';
import process from 'node:process';

const REUSABLE_LOCK_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

export function copyBundledRuntime(
  sourcePath,
  destinationPath,
  {
    copyFile = copyFileSync,
    exists = existsSync,
    warn = (message) => process.stderr.write(`${message}\n`),
  } = {},
) {
  try {
    copyFile(sourcePath, destinationPath);
    return 'copied';
  } catch (error) {
    const code = error && typeof error === 'object' && typeof error.code === 'string' ? error.code : null;
    if (code !== null && REUSABLE_LOCK_CODES.has(code) && exists(destinationPath)) {
      warn(`Bundled runtime is locked (${code}); keeping existing runtime at ${destinationPath}`);
      return 'reused';
    }
    throw error;
  }
}
