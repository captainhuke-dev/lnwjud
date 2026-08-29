import { readFileSync } from 'node:fs';
import path from 'node:path';

export function loadEnvironmentFile(
  filePath: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    return false;
  }

  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvironmentLine(line);
    if (parsed === null || environment[parsed.key] !== undefined) continue;
    environment[parsed.key] = parsed.value;
  }
  return true;
}

export function loadFirstEnvironmentFile(
  candidates: readonly string[],
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  for (const candidate of candidates) {
    if (candidate.trim().length === 0) continue;
    if (loadEnvironmentFile(candidate, environment)) return candidate;
  }
  return null;
}

export function defaultEnvironmentFileCandidates(
  moduleDirectory: string,
  resourcesPath = (process as NodeJS.Process & { readonly resourcesPath?: string }).resourcesPath,
  cwd = process.cwd(),
): readonly string[] {
  return dedupe([
    ...(resourcesPath === undefined || resourcesPath.trim().length === 0
      ? []
      : [path.join(path.dirname(resourcesPath), '.env'), path.join(resourcesPath, '.env')]),
    path.join(cwd, '.env'),
    path.resolve(moduleDirectory, '..', '..', '..', '..', '.env'),
    path.resolve(moduleDirectory, '..', '..', '..', '.env'),
    path.resolve(moduleDirectory, '..', '..', '.env'),
  ]);
}

function parseEnvironmentLine(line: string): { readonly key: string; readonly value: string } | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#')) return null;
  const separator = trimmed.indexOf('=');
  if (separator <= 0) return null;
  const key = trimmed.slice(0, separator).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let value = stripInlineComment(trimmed.slice(separator + 1).trim());
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function stripInlineComment(value: string): string {
  let quote: '"' | "'" | null = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ((character === '"' || character === "'") && (index === 0 || value[index - 1] !== '\\')) {
      quote = quote === character ? null : quote === null ? character : quote;
      continue;
    }
    if (character === '#' && quote === null && (index === 0 || /\s/.test(value[index - 1] ?? ''))) {
      return value.slice(0, index).trimEnd();
    }
  }
  return value;
}

function dedupe(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = process.platform === 'win32' ? path.normalize(value).toLowerCase() : path.normalize(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}
