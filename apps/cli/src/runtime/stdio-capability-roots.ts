import path from 'node:path';

export function configuredStdioCapabilityRoots(
  environment: NodeJS.ProcessEnv,
  configuredRoots: readonly string[] = [],
): readonly string[] {
  return dedupeRoots([
    ...readCapabilityRoots(environment.LNWJUD_CAPABILITY_ROOTS),
    ...readCapabilityRoots(environment.LNWJUD_CAPABILITY_EXTRA_ROOTS),
    ...configuredRoots,
  ]);
}

export function extraStdioCapabilityRoots(environment: NodeJS.ProcessEnv): readonly string[] {
  return dedupeRoots(readCapabilityRoots(environment.LNWJUD_CAPABILITY_EXTRA_ROOTS));
}

function readCapabilityRoots(value: string | undefined): readonly string[] {
  if (value === undefined || value.trim().length === 0) return [];
  return value
    .split(';')
    .map((root) => root.trim())
    .filter((root) => root.length > 0)
    .map((root) => path.resolve(root));
}

function dedupeRoots(roots: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const root of roots) {
    const key = process.platform === 'win32' ? path.normalize(root).toLowerCase() : path.normalize(root);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(root);
  }
  return result;
}
