import { createHash, randomBytes } from 'node:crypto';

export interface OidcClaims {
  readonly issuer: string;
  readonly audience: string | readonly string[];
  readonly subject: string;
  readonly expiresAt: number;
  readonly nonce: string;
}

export interface OidcProviderAdapter {
  exchangeAuthorizationCode(input: {
    readonly code: string;
    readonly codeVerifier: string;
    readonly redirectUri: string;
  }): Promise<OidcClaims>;
}

export interface OidcBoundaryConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly redirectUri: string;
  readonly sessionTtlMs?: number;
}

export interface OidcAuthorizationStart {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly codeChallenge: string;
}

export interface OidcBrowserSession {
  readonly subject: string;
  readonly sessionToken: string;
  readonly expiresAt: string;
  readonly cookie: {
    readonly name: string;
    readonly value: string;
    readonly secure: true;
    readonly httpOnly: true;
    readonly sameSite: 'Lax';
    readonly maxAgeSeconds: number;
  };
}

interface PendingAuthorization {
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly createdAt: string;
}

const DEFAULT_SESSION_TTL_MS = 30 * 60 * 1_000;

function randomSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function createPkceS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export class OidcSessionBoundary {
  private readonly config: OidcBoundaryConfig;
  private readonly provider: OidcProviderAdapter;
  private readonly pending = new Map<string, PendingAuthorization>();

  public constructor(
    config: OidcBoundaryConfig,
    provider: OidcProviderAdapter,
  ) {
    this.config = config;
    this.provider = provider;
  }

  public beginAuthorization(now: Date): OidcAuthorizationStart {
    const state = randomSecret();
    const nonce = randomSecret();
    const codeVerifier = randomSecret();
    this.pending.set(state, {
      nonce,
      codeVerifier,
      createdAt: now.toISOString(),
    });
    return {
      state,
      nonce,
      codeVerifier,
      codeChallenge: createPkceS256Challenge(codeVerifier),
    };
  }

  public async completeAuthorization(
    input: { readonly state: string; readonly code: string },
    now: Date,
  ): Promise<OidcBrowserSession> {
    const pending = this.pending.get(input.state);
    if (pending === undefined) {
      throw new Error('REMOTE_CONTROL_OIDC_STATE_NOT_FOUND');
    }

    const claims = await this.provider.exchangeAuthorizationCode({
      code: input.code,
      codeVerifier: pending.codeVerifier,
      redirectUri: this.config.redirectUri,
    });
    const sessionTtlMs = this.config.sessionTtlMs ?? DEFAULT_SESSION_TTL_MS;
    const sessionToken = randomSecret();
    const expiresAt = new Date(now.getTime() + sessionTtlMs).toISOString();
    return {
      subject: claims.subject,
      sessionToken,
      expiresAt,
      cookie: {
        name: 'lnwjud_rc_session',
        value: sessionToken,
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
        maxAgeSeconds: Math.floor(sessionTtlMs / 1_000),
      },
    };
  }
}
