import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Task Extent-V1.1.0: minimal .env loader for the desktop main process.
 *
 * The repo's .env is the deployment's declared configuration (LNWJUD_UNRESTRICTED,
 * LNWJUD_CAPABILITY_EXTRA_ROOTS, …). start-lnwjud-tunnel.ps1 already loads it for
 * the tunnel path, but the desktop app launched directly never saw those values
 * and silently fell back to the settings DB — the two surfaces disagreed.
 *
 * Rules:
 * - Looks for .env next to the packaged app (process.resourcesPath/..) first, then
 *   the current working directory, then the repo layout (../../ from app dir).
 * - Never overrides variables that are already set in the real environment.
 * - Values may be quoted; `#` starts a comment when at the start of a token.
 */
export function loadDotEnvFile(candidates: readonly string[]): string | null {
  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    let raw: string;
    try {
      raw = readFileSync(candidate, 'utf8');
    } catch {
      continue;
    }
    const applied: string[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      if (key.length === 0) continue;
      const hashIndex = value.indexOf(' #');
      if (hashIndex >= 0) value = value.slice(0, hashIndex).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
        applied.push(key);
      }
    }
    if (applied.length > 0) {
      process.stderr.write(`lnwjud env: loaded ${candidate} (${applied.join(', ')})\n`);
      return candidate;
    }
    return candidate;
  }
  return null;
}

/** Default candidate locations, most specific first. */
export function defaultEnvCandidates(appDir: string): readonly string[] {
  return [
    // Packaged install: <install>/resources/app.asar — .env ships beside it.
    path.join(path.dirname(appDir), '.env'),
    process.cwd() + path.sep + '.env',
    // Repo checkout running from source: apps/desktop/build or apps/desktop.
    path.resolve(appDir, '..', '..', '..', '.env'),
    path.resolve(appDir, '..', '..', '.env'),
  ];
}
