import { existsSync } from 'node:fs';
import {
  allFixedDriveRoots,
  isDriveRoot,
  machineRootPath,
  normalizeWorkspaceRoot,
  type Workspace,
  type WorkspaceService,
} from '@lnwjud/workspace';

/** Ensure the drive containing the preferred workspace is registered as a machine root. */
export async function syncPreferredMachineRoot(
  workspaceService: WorkspaceService,
  preferredPath?: string,
): Promise<Workspace | null> {
  const root = machineRootPath(preferredPath);
  if (!existsSync(root)) return null;

  const existing = await workspaceService.list();
  const target = normalizeWorkspaceRoot(root).toLowerCase();
  const found = existing.find((entry) => normalizeWorkspaceRoot(entry.realRootPath).toLowerCase() === target);
  if (found !== undefined) return found;

  const added = await workspaceService.add(`Local Disk ${root[0]?.toUpperCase() ?? ''}:`, root);
  return added.ok ? added.value : null;
}

/** Register every existing fixed drive root without pruning previously registered roots. */
export async function syncAllDriveRoots(workspaceService: WorkspaceService): Promise<Workspace | null> {
  const roots = allFixedDriveRoots();
  if (roots.length === 0) return null;

  const existing = await workspaceService.list();
  let primary: Workspace | null = null;
  for (const root of roots) {
    const target = normalizeWorkspaceRoot(root).toLowerCase();
    const found = existing.find((entry) => normalizeWorkspaceRoot(entry.realRootPath).toLowerCase() === target);
    if (found !== undefined) {
      if (primary === null) primary = found;
      continue;
    }
    const added = await workspaceService.add(`Local Disk ${root[0]}:`, root);
    if (added.ok && primary === null) primary = added.value;
  }
  if (primary !== null) return primary;
  const after = await workspaceService.list();
  return after.find((entry) => isDriveRoot(entry.realRootPath)) ?? after[0] ?? null;
}

/** Machine-root synchronization for the current access mode. */
export function syncMachineRoots(
  workspaceService: WorkspaceService,
  unrestricted: boolean,
  preferredPath?: string,
): Promise<Workspace | null> {
  return unrestricted ? syncAllDriveRoots(workspaceService) : syncPreferredMachineRoot(workspaceService, preferredPath);
}

/**
 * Task Extend-V1.0.0 (mount roots): register extra capability roots
 * (LNWJUD_CAPABILITY_EXTRA_ROOTS, e.g. NAS mounts M:/Y:/Z:) as workspaces so
 * restricted mode can resolve absolute paths against them. Restricted mode
 * keeps its path control — this only widens the registered boundary.
 */
export async function syncExtraCapabilityRoots(
  workspaceService: WorkspaceService,
  extraRoots: readonly string[],
): Promise<void> {
  for (const raw of extraRoots) {
    const root = normalizeWorkspaceRoot(raw);
    if (!existsSync(root)) continue;
    const existing = await workspaceService.list();
    // A drive letter may already be registered under its canonical UNC real root
    // (e.g. M:\ -> \\MCT-MAC5\mac5\). Match on both forms before inserting.
    const target = root.toLowerCase();
    const alreadyRegistered = existing.some((entry) =>
      normalizeWorkspaceRoot(entry.realRootPath).toLowerCase() === target
      || normalizeWorkspaceRoot(entry.rootPath).toLowerCase() === target,
    );
    if (alreadyRegistered) continue;
    const label = /^[A-Za-z]:\\?$/.test(root) ? `Local Disk ${root[0]}:` : `Mount ${root}`;
    await workspaceService.add(label, root);
  }
}
