import { createHash } from 'node:crypto';
import type { SqliteDatabase } from '@lnwjud/storage';

/**
 * Task 1.6 — Versioned tool catalog (Phase 1, doc §11).
 *
 * The relay keeps a cached tools[] per profile so:
 * - `tools/list` is served from the relay even when the device is offline;
 * - desktop restarts with an unchanged catalog produce NO CHANGE (AI-side
 *   cached schema stays valid — no stale connector);
 * - genuine catalog changes swap atomically and bump catalog_version.
 */
export interface CatalogSnapshot {
  readonly version: number;
  readonly hash: string | null;
  readonly tools: readonly unknown[];
}

export function computeCatalogHash(tools: readonly unknown[]): string {
  return createHash('sha256').update(JSON.stringify(tools)).digest('hex');
}

export class CatalogService {
  public constructor(private readonly db: SqliteDatabase) {}

  public get(profileId: string): CatalogSnapshot | null {
    const row = this.db
      .connection
      .prepare('SELECT catalog_version, catalog_hash FROM profiles WHERE id = ?')
      .get(profileId) as { catalog_version: number; catalog_hash: string | null } | undefined;
    if (row === undefined) return null;
    const payload = this.db.connection
      .prepare('SELECT tools_json FROM profile_catalogs WHERE profile_id = ?')
      .get(profileId) as { tools_json: string } | undefined;
    return {
      version: row.catalog_version,
      hash: row.catalog_hash,
      tools: payload === undefined ? [] : (JSON.parse(payload.tools_json) as unknown[]),
    };
  }

  /**
   * Update the cached catalog from a device HELLO/UPDATE.
   * Returns 'NO_CHANGE' when the hash matches the stored one; 'UPDATED' when
   * swapped atomically; 'INITIAL' on first publication.
   */
  public publish(
    profileId: string,
    tools: readonly unknown[],
    deviceHashHint?: string | null,
  ): 'NO_CHANGE' | 'UPDATED' | 'INITIAL' {
    const hash = deviceHashHint ?? computeCatalogHash(tools);
    const existing = this.get(profileId);
    if (existing !== null && existing.hash === hash && existing.tools.length > 0) {
      return 'NO_CHANGE';
    }
    const nextVersion = (existing?.version ?? 0) + 1;
    const toolsJson = JSON.stringify(tools);
    this.db.connection.prepare(`
      INSERT INTO profile_catalogs (profile_id, tools_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(profile_id) DO UPDATE SET tools_json = excluded.tools_json, updated_at = excluded.updated_at
    `).run(profileId, toolsJson, new Date().toISOString());
    this.db.connection
      .prepare('UPDATE profiles SET catalog_version = ?, catalog_hash = ? WHERE id = ?')
      .run(nextVersion, hash, profileId);
    return existing === null || existing.version === 0 ? 'INITIAL' : 'UPDATED';
  }

  /** True when the relay can serve tools/list without the device. */
  public canServeOffline(profileId: string): boolean {
    const snapshot = this.get(profileId);
    return snapshot !== null && snapshot.tools.length > 0;
  }
}
