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

export function createPkceS256Challenge(verifier: string): string {
  void verifier;
  return '';
}

export class OidcSessionBoundary {
  public constructor(
    config: OidcBoundaryConfig,
    provider: OidcProviderAdapter,
  ) {
    void config;
    void provider;
  }

  public beginAuthorization(now: Date): OidcAuthorizationStart {
    void now;
    throw new Error('REMOTE_CONTROL_OIDC_NOT_IMPLEMENTED');
  }

  public async completeAuthorization(
    input: { readonly state: string; readonly code: string },
    now: Date,
  ): Promise<OidcBrowserSession> {
    void input;
    void now;
    throw new Error('REMOTE_CONTROL_OIDC_NOT_IMPLEMENTED');
  }
}
