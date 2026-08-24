import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { SqliteDatabase } from '@lnwjud/storage';
import { migrateRelaySchema } from '../src/db/schema.js';
import { codeChallengeS256, OAuthService } from '../src/oauth/oauth-service.js';

let directory: string;
let db: SqliteDatabase;
let oauth: OAuthService;

beforeEach(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'lnwjud-relay-oauth-'));
  db = new SqliteDatabase(path.join(directory, 'relay.sqlite'), {});
  migrateRelaySchema(db);
  oauth = new OAuthService(db);
});

afterEach(async () => {
  db.close();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(directory, { recursive: true, force: true }).catch(() => undefined);
});

const CLIENT = 'ai-client-1';
const REDIRECT = 'https://chatgpt.example/connector/callback';

function makeVerifier(): string {
  return createHash('sha256').update(String(Math.random())).digest('base64url');
}

describe('OAuth PKCE flow', () => {
  it('issues a token for a valid code + verifier (S256)', () => {
    const verifier = makeVerifier();
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    const token = oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    });
    expect(token).not.toBeNull();
    expect(token?.tokenType).toBe('Bearer');
    expect(token?.expiresIn).toBeGreaterThan(0);
    // Token validates.
    expect(oauth.validateAccessToken(token!.accessToken)).toBe(true);
  });

  it('rejects a verifier that does not match the challenge', () => {
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(makeVerifier()));
    const wrongVerifier = makeVerifier();
    expect(oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: wrongVerifier,
    })).toBeNull();
    // Code is consumed even on failure — no retry with the correct verifier.
    const correct = makeVerifier();
    expect(oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: correct,
    })).toBeNull();
  });

  it('rejects an expired authorization code', () => {
    const verifier = makeVerifier();
    const past = new Date(Date.now() - 20 * 60 * 1_000); // 20 min ago > 10 min TTL
    const stale = new OAuthService(db, past);
    const grant = stale.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    expect(oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    })).toBeNull();
  });

  it('enforces single use — a consumed code cannot be exchanged twice', () => {
    const verifier = makeVerifier();
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    const first = oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    });
    expect(first).not.toBeNull();
    const second = oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    });
    expect(second).toBeNull();
  });

  it('rejects mismatched redirect_uri or client_id', () => {
    const verifier = makeVerifier();
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    expect(oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: 'other-client',
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    })).toBeNull();
    expect(oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: 'https://evil.example/cb',
      codeVerifier: verifier,
    })).toBeNull();
  });

  it('validates access tokens and rejects unknown/expired ones', async () => {
    const verifier = makeVerifier();
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    const token = oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    })!;

    expect(oauth.validateAuthorizationHeader(`Bearer ${token.accessToken}`)).toBe(true);
    expect(oauth.validateAuthorizationHeader(`Bearer totally-fake`)).toBe(false);
    expect(oauth.validateAuthorizationHeader(undefined)).toBe(false);
    expect(oauth.validateAuthorizationHeader('Basic dXNlcjpwYXNz')).toBe(false);

    // Expired token: insert via a service pinned to the past, then validate now.
    const past = new Date(Date.now() - 40 * 24 * 60 * 60 * 1_000);
    const stale = new OAuthService(db, past);
    const v2 = makeVerifier();
    const g2 = stale.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(v2));
    const t2 = stale.exchangeCode({
      code: g2.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: v2,
    })!;
    expect(oauth.validateAccessToken(t2.accessToken)).toBe(false);
  });

  it('revokes all tokens for a client on decommission', () => {
    const verifier = makeVerifier();
    const grant = oauth.beginAuthorization(CLIENT, REDIRECT, codeChallengeS256(verifier));
    const token = oauth.exchangeCode({
      code: grant.authorizationCode,
      clientId: CLIENT,
      redirectUri: REDIRECT,
      codeVerifier: verifier,
    })!;
    expect(oauth.validateAccessToken(token.accessToken)).toBe(true);
    oauth.revokeClient(CLIENT);
    expect(oauth.validateAccessToken(token.accessToken)).toBe(false);
  });
});
