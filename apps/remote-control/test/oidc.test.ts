import { describe, expect, it } from 'vitest';
import {
  createPkceS256Challenge,
  OidcSessionBoundary,
  type OidcClaims,
  type OidcProviderAdapter,
} from '../src/auth/oidc.js';

class FakeProvider implements OidcProviderAdapter {
  public claims: OidcClaims | undefined;
  public exchangeCount = 0;
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
    this.exchangeCount += 1;
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

function startFlow(claimOverrides: Partial<OidcClaims> = {}): {
  readonly boundary: OidcSessionBoundary;
  readonly provider: FakeProvider;
  readonly started: ReturnType<OidcSessionBoundary['beginAuthorization']>;
} {
  const provider = new FakeProvider();
  const boundary = new OidcSessionBoundary(config, provider);
  const started = boundary.beginAuthorization(now);
  provider.claims = {
    issuer: config.issuer,
    audience: config.clientId,
    subject: 'operator-1',
    expiresAt: Math.floor((now.getTime() + 5 * 60 * 1_000) / 1_000),
    nonce: started.nonce,
    ...claimOverrides,
  };
  return { boundary, provider, started };
}

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
    const { boundary, provider, started } = startFlow();

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

  it('rejects provider claims from the wrong issuer', async () => {
    const { boundary, started } = startFlow({
      issuer: 'https://attacker.example.test',
    });

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    )).rejects.toThrow();
  });

  it('rejects provider claims whose audience does not contain the configured client id', async () => {
    const { boundary, started } = startFlow({ audience: ['other-client', 'another-client'] });

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    )).rejects.toThrow();
  });

  it('accepts an audience array when it contains the configured client id', async () => {
    const { boundary, started } = startFlow({ audience: ['other-client', config.clientId] });

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    )).resolves.toMatchObject({ subject: 'operator-1' });
  });

  it('rejects expired provider claims', async () => {
    const { boundary, started } = startFlow({
      expiresAt: Math.floor(now.getTime() / 1_000),
    });

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    )).rejects.toThrow();
  });

  it('rejects a nonce mismatch', async () => {
    const { boundary, started } = startFlow({ nonce: 'wrong-nonce' });

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    )).rejects.toThrow();
  });

  it('consumes state after one successful callback and never exchanges a replay', async () => {
    const { boundary, provider, started } = startFlow();

    await boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      now,
    );
    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'replayed-code' },
      now,
    )).rejects.toThrow();
    expect(provider.exchangeCount).toBe(1);
  });

  it('rejects a pending authorization older than ten minutes before provider exchange', async () => {
    const { boundary, provider, started } = startFlow();

    await expect(boundary.completeAuthorization(
      { state: started.state, code: 'authorization-code' },
      new Date(now.getTime() + 10 * 60 * 1_000 + 1),
    )).rejects.toThrow();
    expect(provider.exchangeCount).toBe(0);
  });
});
