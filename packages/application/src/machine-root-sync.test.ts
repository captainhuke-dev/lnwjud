import { describe, expect, it } from 'vitest';
import type { WorkspaceService } from '@lnwjud/workspace';
import { syncExtraCapabilityRoots } from './machine-root-sync.js';

describe('extra capability root synchronization', () => {
  it('registers an existing extra root as a workspace', async () => {
    const addedRoots: string[] = [];
    const workspaceService = {
      list: async () => [],
      add: async (_label: string, root: string) => {
        addedRoots.push(root);
        return { ok: false, error: new Error('test-only') };
      },
    } as unknown as WorkspaceService;

    await syncExtraCapabilityRoots(workspaceService, ['Z:\\'], () => true);

    expect(addedRoots).toEqual(['Z:\\']);
  });

  it('does not register a mapped-drive root that already exists by rootPath', async () => {
    const addedRoots: string[] = [];
    const workspaceService = {
      list: async () => [{
        id: 'existing',
        name: 'NAS',
        rootPath: 'Z:\\',
        realRootPath: '\\\\server\\share\\',
      }],
      add: async (_label: string, root: string) => {
        addedRoots.push(root);
        return { ok: false, error: new Error('test-only') };
      },
    } as unknown as WorkspaceService;

    await syncExtraCapabilityRoots(workspaceService, ['Z:\\'], () => true);

    expect(addedRoots).toEqual([]);
  });
});
