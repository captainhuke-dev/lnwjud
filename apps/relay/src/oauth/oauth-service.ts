import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { SqliteDatabase } from '@lnwjud/storage';

/**
 * Task 1.7 — OAuth 2.0 (PKCE) on the profile endpoint (Phase 1, doc §2/§7).
 *
 * Minimal self-hosted design: single relay issuer, first-party grant.
 * AI clients connect once with the standard authorization-code + PKCE flow;
 * access tokens are opaque random strings hashed at rest (no JWT deps).
 */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1_000; // 30 days
const CODE_TTL_MS = 10 * 60 * 1_000; // authorization code: 10 minutes

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** S256 code challenge per RFC 7636. */
export function codeChallengeS256(verifier: string): string {
  return sha256(verifier).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface OAuthRow {
  id: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_created_at: string;
}

export class OAuthService {
  public constructor(
    private readonly db: SqliteDatabase,
    private readonly now: Date = new Date(),
  ) {}

  /**
   * Start an authorization: registers a one-time code bound to the client's
   * PKCE challenge. The returned code is delivered via the redirect URI.
   */
  public beginAuthorization(clientId: string, redirectUri: string, codeChallenge: string, scope = 'mcp'): {
    authorizationCode: string;
    expiresIn: number;
  } {
    if (!clientId || !redirectUri) throw new Error('client_id and redirect_uri are required');
    if (!codeChallenge) throw new Error('code_challenge is required for PKCE');
    const code = randomBytes(32).toString('base64url');
    this.db.connection.prepare(`
      INSERT INTO oauth_codes (id, code_hash, client_id, redirect_uri, scope, code_challenge, code_created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), sha256(code), clientId, redirectUri, scope, codeChallenge, this.now.toISOString());
    return { authorizationCode: code, expiresIn: CODE_TTL_MS / 1_000 };
  }

  /**
   * Exchange an authorization code (+ verifier) for an access token.
   * Validates: code hash exists & unexpired, redirect_uri matches, S256
   * verifier matches the stored challenge. Single use — consumed on success.
   */
  public exchangeCode(input: {
    code: string;
    clientId: string;
    redirectUri: string;
    codeVerifier: string;
  }): { accessToken: string; tokenType: 'Bearer'; expiresIn: number } | null {
    const row = this.findCode(input.code);
    if (row === null) return null;

    const createdAt = new Date(row.code_created_at).getTime();
    if (this.now.getTime() - createdAt > CODE_TTL_MS) {
      this.consumeCode(row.id);
      return null;
    }
    if (row.client_id !== input.clientId) return null;
    if (row.redirect_uri !== input.redirectUri) return null;
    if (codeChallengeS256(input.codeVerifier) !== row.code_challenge
      && !constantTimeEquals(codeChallengeS256(input.codeVerifier), row.code_challenge)) {
      return null;
    }

    this.consumeCode(row.id);
    const accessToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(this.now.getTime() + TOKEN_TTL_MS).toISOString();
    this.db.connection.prepare(`
      INSERT INTO oauth_tokens (token_hash, client_id, scope, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sha256(accessToken), input.clientId, row.scope, this.now.toISOString(), expiresAt);
    return { accessToken, tokenType: 'Bearer', expiresIn: TOKEN_TTL_MS / 1_000 };
  }

  /** Validate a Bearer token presented to /p/:profileId/mcp. */
  public validateAccessToken(token: string): boolean {
    if (token.length === 0) return false;
    const row = this.db.connection
      .prepare('SELECT expires_at FROM oauth_tokens WHERE token_hash = ?')
      .get(sha256(token)) as { expires_at: string } | undefined;
    if (row === undefined) return false;
    return new Date(row.expires_at).getTime() > this.now.getTime();
  }

  /** Extract and validate a Bearer token from an Authorization header value. */
  public validateAuthorizationHeader(header: string | undefined): boolean {
    if (header === undefined) return false;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match === null) return false;
    return this.validateAccessToken(match[1]!);
  }

  /** Revoke all tokens for a client (device decommission). */
  public revokeClient(clientId: string): void {
    this.db.connection.prepare('DELETE FROM oauth_tokens WHERE client_id = ?').run(clientId);
  }

  private findCode(code: string): OAuthRow | null {
    const row = this.db.connection
      .prepare(`SELECT id, client_id, redirect_uri, scope, code_challenge, code_created_at
                FROM oauth_codes WHERE code_hash = ?`)
      .get(sha256(code)) as OAuthRow | undefined;
    return row ?? null;
  }

  private consumeCode(id: string): void {
    this.db.connection.prepare('DELETE FROM oauth_codes WHERE id = ?').run(id);
  }
}
