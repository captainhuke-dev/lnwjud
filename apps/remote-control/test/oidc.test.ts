import { describe, expect, it } from 'vitest';
import {
  createPkceS256Challenge,
  OidcSessionBoundary,
  type OidcClaims,
  type OidcProviderAdapter,
} from '../src/auth/oidc.js';

class FakeProvider implements OidcProviderAdapter {
  public claims: OidcClaims | undefined;
  public lastInput: {
    readonly code: string;
    readonly codeVerifier: string;
    readonly redirectUri: string;
  } | undefined;

  public async exchangeAuthorizationCode(input: {
    readonly code: string;
    readonly codeVerifier: string;
    readonly redirectUri: string;
  }): Promise<OidcClaims> {
    this.lastInput = input;
    if (this.claims === undefined) {
      throw new Error('TEST_PROVIDER_CLAIMS_MISSING');
    }
    return this.claims;
  }
}

const config = {
  issuer: 'https://issuer.example.test',
  clientId: 'lnwjud-remote-control',
  redirectUri: 'https://control.example.test/auth/callback',
  sessionTtlMs: 30 * 60 * 1_000,
} as const;

const now = new Date('2026-08-29T11:20:00.000Z');

describe('remote-control OIDC boundary', () => {
  it('computes RFC 7636 S256 from SHA-256 bytes using base64url without padding', () => {
    expect(createPkceS256Challenge(
      'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
    )).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('starts an authorization with independent high-entropy state, nonce, verifier, and matching challenge', () => {
    const boundary = new OidcSessionBoundary(config, new FakeProvider());
    const started = boundary.beginAuthorization(now);

    expect(started.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(started.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(started.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(started.state).not.toBe(started.nonce);
    expect(started.state).not.toBe(started.codeVerifier);
    expect(started.nonce).not.toBe(started.codeVerifier);
    expect(started.codeChallenge).toBe(createPkceS256Challenge(started.codeVerifier));
  });

  it('exchanges a valid callback with the stored verifier and returns a bounded secure browser session', async () => {
    const provider = new FakeProvider();
    const boundary = new OidcSessionBoundary(config, provider);
    const started = boundary.beginAuthorization(now);
    provider.claims = {
      issuer: config.issuer,
      audience: config.clientId,
      subject: 'operator-1',
      expiresAt: Math.floor((now.getTime() + 5 * 60 * 1_000) / 1_000),
      nonce: started.nonce,
    };

    const session = await boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    );

    expect(provider.lastInput).toEqual({
      code: 'authorization-code',
      codeVerifier: started.codeVerifier,
      redirectUri: config.redirectUri,
    });
    expect(session.subject).toBe('operator-1');
    expect(session.sessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session.expiresAt).toBe('2026-08-29T11:50:00.000Z');
    expect(session.cookie).toEqual({
      name: 'lnwjud_rc_session',
      value: session.sessionToken,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
      maxAgeSeconds: 1800,
    });
  });
});
