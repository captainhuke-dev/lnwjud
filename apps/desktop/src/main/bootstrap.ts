import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultEnvironmentFileCandidates, loadFirstEnvironmentFile } from './env-file.js';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const loadedEnvironmentFile = loadFirstEnvironmentFile(defaultEnvironmentFileCandidates(moduleDirectory));
if (loadedEnvironmentFile !== null) {
  process.stderr.write(`lnwjud env: loaded ${loadedEnvironmentFile}\n`);
}

await import('./main.js');
