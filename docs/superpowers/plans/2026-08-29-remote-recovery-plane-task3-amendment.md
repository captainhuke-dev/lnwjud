# Remote Recovery Plane — Task 3 Execution Amendment

Date: 2026-08-29
Applies to: `docs/superpowers/plans/2026-08-29-remote-recovery-plane.md`, Task 3 only.

This amendment does not change the approved architecture, trust boundary, protocol v1 action set, or authorization model. It narrows implementation details discovered during execution.

## Transport decision

Use Node's built-in `node:http` server for the Remote Control Service HTTP boundary and `ws` with `WebSocketServer({ noServer: true })` for `/device/ws` upgrade handling. Fastify is not required by the approved design and is intentionally omitted to reduce the dependency/lockfile surface.

The device channel remains outbound-initiated by the Supervisor; the server authenticates the device before registering presence. No MCP proxy, generic shell, arbitrary tool forwarding, or High Risk action is added.

## OIDC decision

Operator authentication remains OpenID Connect Authorization Code + PKCE. The service consumes an external OIDC issuer; it does not revive the historical self-issued Relay OAuth authority.

PKCE S256 must follow RFC 7636 exactly: `BASE64URL(SHA256(ASCII(code_verifier)))`, without hex encoding or padding. State and nonce are single-use and bounded. Returned identity validation must fail closed on issuer, audience/client ID, expiry, nonce, or state mismatch before a browser session is created.

Network discovery/token exchange and signed-token validation live behind injectable adapters for deterministic tests; production configuration still requires issuer, clientId, and redirectUri. Browser session cookies remain Secure, HttpOnly, SameSite=Lax or stricter, and bounded in lifetime.

## TDD execution split

Task 3 is executed as three subcycles on the same independent `custom/remote-recovery-plane` branch:

1. **OIDC boundary** — PKCE/state/nonce/session validation with no WebSocket dependency.
2. **Authenticated device channel** — add `ws`, bearer-device authentication, protocolVersion 1, one current channel per device, heartbeat/presence freshness, and revocation rejection.
3. **HTTP control API** — authenticated status/enrollment/command routes, bounded action parsing, command journal integration, and duplicate terminal-result replay without second delivery.

Each subcycle must have a valid RED after install/lint/typecheck and a GREEN authoritative Windows verification before the next production subcycle starts.
