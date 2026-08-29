# Remote Recovery Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent per-user Windows Supervisor plus an outbound authenticated Remote Control Service/Web App that can report truthful machine/Desktop/MCP/tunnel health and execute only bounded Normal/Diagnostic/Recovery actions when the lnwjud execution plane is unhealthy.

**Architecture:** Add a runtime-neutral protocol package, a standalone Supervisor process, and a separate Remote Control Service. The Supervisor establishes outbound WSS, stores its device credential with Windows DPAPI, performs local probes/recovery without Electron/MCP dependencies, and journals command outcomes for replay safety; the service uses OIDC Authorization Code + PKCE for operators, hashed device credentials for agents, and a dedicated SQLite database. NSIS-installed mode registers the Supervisor with HKCU Run; portable mode does not claim persistent recovery.

**Tech Stack:** Node.js 24, TypeScript 6.0.2, `node:sqlite`, `ws`, Fastify, Vitest, Electron Builder/NSIS, Windows PowerShell, existing `@lnwjud/shared`, `@lnwjud/process`, `@lnwjud/audit`, and narrowly extracted tunnel helpers.

**Spec:** `docs/superpowers/specs/2026-08-29-remote-recovery-plane-design.md`

## Global Constraints

- Branch: `custom/remote-recovery-plane`; baseline `main@edbc739b6df599e8b824c7c2c75cda1cd9e6d493` unless a fresh base check requires re-planning.
- Remote Control Service is not an MCP relay and must never proxy arbitrary MCP tools, shell commands, filesystem requests, or generic agent execution.
- Protocol v1 exposes only fixed Normal, Diagnostic, and Recovery actions. High Risk remote actions are absent/disabled.
- Supervisor must not import Electron, Desktop IPC, or bootstrap the MCP server.
- Recovery state is a vector: machine, supervisor, desktop, mcp, tunnel; ambiguous evidence maps to `unknown` rather than an inferred state.
- Device connection is outbound-only WSS/HTTPS. No inbound remote-control listener opens on the Windows host.
- Operator auth is OIDC Authorization Code + PKCE. Device auth uses one-time enrollment plus a high-entropy bearer token; server stores only a hash and Windows stores the token protected by DPAPI.
- Remote service and Supervisor journals use dedicated state; neither may treat Desktop runtime SQLite as remote-control authority.
- NSIS-installed mode uses reversible HKCU Run startup registration. Portable mode must not advertise persistent recovery.
- Secrets must never enter Git, Project Source, command payload logs, audit summaries, release evidence, or Web UI.
- Each task follows RED -> minimal GREEN -> focused verification -> commit. No task may broaden scope to unrelated refactors.
- Full Windows authoritative release verification is required on the final unchanged candidate before the branch can be called verified.

---

## File Structure

### Shared protocol
- `packages/remote-control-contract/package.json` — package metadata/exports.
- `packages/remote-control-contract/tsconfig.json` — project reference config.
- `packages/remote-control-contract/src/index.ts` — protocol v1 schemas/types and action allowlist.
- `packages/remote-control-contract/src/protocol.test.ts` — protocol validation/replay metadata tests.

### Remote Control Service
- `apps/remote-control/package.json` — Fastify/WS service package.
- `apps/remote-control/tsconfig.json` — service project config.
- `apps/remote-control/src/db.ts` — dedicated SQLite schema and repositories.
- `apps/remote-control/src/auth/oidc.ts` — OIDC Authorization Code + PKCE boundary.
- `apps/remote-control/src/auth/device-auth.ts` — one-time enrollment and hashed bearer-token verification.
- `apps/remote-control/src/device-channel.ts` — authenticated Supervisor WSS sessions/presence.
- `apps/remote-control/src/command-journal.ts` — server-side command claim/result journal.
- `apps/remote-control/src/server.ts` — Fastify routes, auth gates, WSS upgrade wiring.
- `apps/remote-control/src/web/*` — minimal static Web UI assets/state helpers.
- `apps/remote-control/test/*.test.ts` — database, auth, channel, API, and Web behavior.

### Supervisor
- `apps/supervisor/package.json` — standalone Node process package.
- `apps/supervisor/tsconfig.json` — Supervisor project config.
- `apps/supervisor/src/config.ts` — bounded env/config loading.
- `apps/supervisor/src/device-credential.ts` — DPAPI-protected device enrollment credential.
- `apps/supervisor/src/command-journal.ts` — local terminal outcome journal.
- `apps/supervisor/src/control-channel.ts` — outbound WSS + reconnect/version/auth handshake.
- `apps/supervisor/src/health.ts` — machine/Desktop/MCP/tunnel probes with evidence timestamps.
- `apps/supervisor/src/recovery-dispatcher.ts` — fixed action handlers and safety gates.
- `apps/supervisor/src/main.ts` — composition root only.
- `apps/supervisor/test/*.test.ts` — focused Supervisor tests.

### Reused/extracted host adapters
- `packages/shared/src/windows-dpapi.ts` — reuse only; modify only if a runtime-neutral export gap is proven by a RED test.
- `packages/process/src/*` — reuse process identity/tree helpers; add focused helper only if current API cannot prove owned target identity.
- `apps/desktop/src/main/tunnel-*.ts` — do not import into Supervisor directly. Extract only process-independent parsing/launcher semantics into a small package/module when a RED test demonstrates the dependency boundary.

### Packaging / release
- `apps/desktop/electron-builder.yml` — package Supervisor bundle for installed mode.
- `apps/desktop/build/installer.nsh` — HKCU Run add/remove for NSIS install/uninstall.
- `apps/desktop/scripts/*` — Supervisor bundle preparation only if electron-builder cannot consume workspace output directly.
- `tests/packaging/desktop-packaging.test.ts` — installed-vs-portable recovery assertions.
- `tests/release/remote-recovery-plane.test.ts` — source/release invariants.
- `tests/acceptance/remote-recovery-plane.acceptance.test.ts` or existing Desktop acceptance location — failure-matrix acceptance using disposable fixtures.

---

### Task 1: Protocol v1 and fixed action boundary

**Files:**
- Create: `packages/remote-control-contract/package.json`
- Create: `packages/remote-control-contract/tsconfig.json`
- Create: `packages/remote-control-contract/src/index.ts`
- Create: `packages/remote-control-contract/src/protocol.test.ts`
- Modify: `pnpm-workspace.yaml` only if current workspace glob does not already include `packages/*`
- Modify: `tsconfig.json` to add the project reference

**Interfaces:**
- Produces: `REMOTE_CONTROL_PROTOCOL_VERSION = 1`.
- Produces: `RemoteAction = 'status.refresh' | 'logs.recent' | 'diagnostics.lnwjud' | 'desktop.start' | 'desktop.restart' | 'tunnel.restart' | 'tunnel.recover_stale'`.
- Produces: `RemoteCommandV1`, `CommandResultV1`, `HealthSnapshotV1`, `DeviceHelloV1`, `DeviceWelcomeV1` and `parseRemoteCommandV1(value: unknown): RemoteCommandV1`.
- Constraint: no free-form command string, shell text, filesystem path, MCP tool name, or arbitrary argv field exists in protocol v1.

- [ ] **Step 1: Write the failing protocol tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseRemoteCommandV1 } from './index.js';

describe('remote-control protocol v1', () => {
  it('accepts a bounded status command', () => {
    expect(parseRemoteCommandV1({
      protocolVersion: 1,
      commandId: 'cmd-1',
      deviceId: 'dev-1',
      action: 'status.refresh',
      createdAt: '2026-08-29T09:00:00.000Z',
      expiresAt: '2026-08-29T09:01:00.000Z',
      actorId: 'operator-1',
      parameters: {},
    }).action).toBe('status.refresh');
  });

  it.each(['shell', 'file.write', 'mcp.call', 'system.reboot'])('rejects %s', (action) => {
    expect(() => parseRemoteCommandV1({
      protocolVersion: 1, commandId: 'x', deviceId: 'd', action,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
      actorId: 'operator-1', parameters: {},
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control-contract test`
Expected: FAIL because the package/module does not exist.

- [ ] **Step 3: Implement minimal discriminated protocol types and parser**

Implementation requirements:
- maintain a frozen `Set<RemoteAction>` allowlist;
- reject protocol versions other than `1`;
- require non-empty IDs and valid ISO timestamps;
- require `expiresAt > createdAt`;
- action-specific parameters are exact objects: `desktop.start`, `desktop.restart`, `tunnel.restart`, and `tunnel.recover_stale` accept only `{}` in v1; diagnostics/logs may accept bounded integer `limit` only where explicitly defined;
- recursively reject unknown keys in command objects to prevent a hidden generic execution field.

- [ ] **Step 4: Run focused GREEN + typecheck**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control-contract test && corepack pnpm@10.15.0 typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/remote-control-contract tsconfig.json pnpm-workspace.yaml
git commit -m "feat(remote-control): define bounded protocol v1"
```

---

### Task 2: Dedicated Remote Control SQLite authority and device enrollment

**Files:**
- Create: `apps/remote-control/package.json`
- Create: `apps/remote-control/tsconfig.json`
- Create: `apps/remote-control/src/db.ts`
- Create: `apps/remote-control/src/auth/device-auth.ts`
- Create: `apps/remote-control/src/command-journal.ts`
- Create: `apps/remote-control/test/db.test.ts`
- Create: `apps/remote-control/test/device-auth.test.ts`
- Create: `apps/remote-control/test/command-journal.test.ts`
- Modify: `tsconfig.json` project references

**Interfaces:**
- Consumes: protocol types from Task 1.
- Produces: `RemoteControlDatabase(filename: string)` exposing `connection`, `close()`.
- Produces: `issueEnrollmentToken(db, deviceLabel): { enrollmentId: string; secret: string }`, `redeemEnrollmentToken(db, enrollmentId, secret): { deviceId: string; deviceToken: string }`, `verifyDeviceToken(db, deviceId, token): boolean`, `revokeDevice(db, deviceId): void`.
- Produces: `CommandJournal.claim(command)`, `markAccepted(commandId)`, `commitResult(commandId, result)`, `get(commandId)` with terminal replay semantics.

- [ ] **Step 1: Write RED tests for schema isolation, token hashing, one-time enrollment, and replay journal**

Test requirements:
- database creates only remote-control tables in a temp DB;
- raw enrollment/device tokens are absent from persisted rows;
- redeeming the same enrollment twice fails;
- revoked device token fails verification;
- `claim()` returns prior entry for duplicate `commandId` and committed result is recoverable after closing/reopening DB.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- db.test.ts device-auth.test.ts command-journal.test.ts`
Expected: FAIL because service package/modules do not exist.

- [ ] **Step 3: Implement minimal SQLite schema**

Use `node:sqlite` directly, not Desktop `SqliteDatabase`, to preserve state-authority separation. Required tables:

```sql
CREATE TABLE devices (
  device_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE TABLE enrollments (
  enrollment_id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  label TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  redeemed_at TEXT
);
CREATE TABLE command_journal (
  command_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  state TEXT NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  device_id TEXT,
  command_id TEXT,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

Token hashing: `scryptSync(secret, per-record random salt, 32)` and store `scrypt:<saltBase64>:<hashBase64>`. Compare with `timingSafeEqual`.

- [ ] **Step 4: Run focused GREEN**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- db.test.ts device-auth.test.ts command-journal.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/remote-control tsconfig.json pnpm-lock.yaml
git commit -m "feat(remote-control): add device and command persistence"
```

---

### Task 3: Authenticated Remote Control Service and device WSS channel

**Files:**
- Create: `apps/remote-control/src/auth/oidc.ts`
- Create: `apps/remote-control/src/device-channel.ts`
- Create: `apps/remote-control/src/server.ts`
- Create: `apps/remote-control/test/oidc.test.ts`
- Create: `apps/remote-control/test/device-channel.test.ts`
- Create: `apps/remote-control/test/server.test.ts`
- Modify: `apps/remote-control/package.json`

**Interfaces:**
- Consumes: DB/auth/journal from Task 2 and protocol from Task 1.
- Produces: `createRemoteControlServer(options): FastifyInstance`.
- Operator HTTP API: authenticated `GET /api/devices`, `GET /api/devices/:id/status`, `POST /api/devices/:id/commands`.
- Enrollment admin API must itself require authenticated operator context.
- Device WSS path: `/device/ws`; handshake requires `deviceId`, bearer token, and `protocolVersion: 1`.

- [ ] **Step 1: Write RED tests**

Required cases:
- unauthenticated operator routes return 401;
- OIDC callback rejects state/nonce mismatch;
- device WSS rejects unknown/revoked tokens and protocol mismatch;
- authenticated device presence updates last-seen without revealing token;
- command POST rejects High Risk/unknown action before journal insertion;
- duplicate command ID returns prior terminal outcome without a second WSS delivery.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- oidc.test.ts device-channel.test.ts server.test.ts`
Expected: FAIL because modules/routes do not exist.

- [ ] **Step 3: Implement OIDC boundary and WSS service**

OIDC contract:
- Authorization Code + PKCE S256 only;
- secure, HttpOnly, SameSite=Lax session cookie in non-test mode;
- issuer/client-id/redirect URI from explicit config; client secret optional only for public-client provider configurations;
- validate issuer, audience/client ID, nonce, state, expiry before establishing operator session;
- tests use injected fake OIDC adapter; do not make network calls.

WSS contract:
- `ws` server uses `noServer: true` and explicit Fastify HTTP upgrade path;
- authenticate before device is registered online;
- one current connection per device; newer valid connection replaces old connection with an explicit close reason;
- maintain presence in memory, durable last-seen in DB;
- JSON messages are parsed through Task 1 schemas only.

- [ ] **Step 4: Run focused GREEN**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- oidc.test.ts device-channel.test.ts server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/remote-control pnpm-lock.yaml
git commit -m "feat(remote-control): add authenticated control service"
```

---

### Task 4: Supervisor credential store, local journal, and outbound channel

**Files:**
- Create: `apps/supervisor/package.json`
- Create: `apps/supervisor/tsconfig.json`
- Create: `apps/supervisor/src/config.ts`
- Create: `apps/supervisor/src/device-credential.ts`
- Create: `apps/supervisor/src/command-journal.ts`
- Create: `apps/supervisor/src/control-channel.ts`
- Create: `apps/supervisor/test/device-credential.test.ts`
- Create: `apps/supervisor/test/command-journal.test.ts`
- Create: `apps/supervisor/test/control-channel.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: Task 1 protocol; `protectWithWindowsDpapi`/`unprotectWithWindowsDpapi` from `@lnwjud/shared`.
- Produces: `SupervisorConfig { controlUrl, deviceId, dataDir, reconnectMinMs, reconnectMaxMs }`.
- Produces: `saveDeviceCredential(file, token)`, `loadDeviceCredential(file)` with `dpapi:v1:` text envelope owned by Supervisor.
- Produces: local `SupervisorCommandJournal` using its own SQLite file.
- Produces: `ControlChannel` that performs authenticated `DeviceHelloV1`, bounded exponential backoff + jitter, command dispatch callback, and terminal replay.

- [ ] **Step 1: Write RED tests**

Required cases:
- token file never contains plaintext token;
- missing/invalid credential fails closed;
- local journal survives process object recreation;
- duplicate committed command returns cached result without callback invocation;
- expired command is rejected before callback invocation;
- disconnect/reconnect does not cause terminal command re-execution;
- protocol mismatch closes and reports upgrade-required state.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test -- device-credential.test.ts command-journal.test.ts control-channel.test.ts`
Expected: FAIL because Supervisor package does not exist.

- [ ] **Step 3: Implement minimal Supervisor channel**

Rules:
- Supervisor opens no inbound TCP listener;
- connection URL must be `wss:` outside an explicitly injected test transport;
- Authorization header contains device bearer token only during handshake and is never logged;
- reconnect formula: `min(maxMs, minMs * 2**attempt) + random(0..250ms)` with injected RNG in tests;
- command dispatcher callback receives already validated `RemoteCommandV1` only;
- journal claim occurs before execution and commit before sending result.

- [ ] **Step 4: Run focused GREEN + typecheck**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test && corepack pnpm@10.15.0 typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/supervisor tsconfig.json pnpm-lock.yaml
git commit -m "feat(supervisor): add authenticated outbound control channel"
```

---

### Task 5: Truthful health vector independent of Desktop/MCP

**Files:**
- Create: `apps/supervisor/src/health.ts`
- Create: `apps/supervisor/test/health.test.ts`
- Modify: `apps/supervisor/package.json` only if a current package dependency is required
- Reuse: `packages/process/src/*`, Desktop profile/state file formats only through process-independent readers

**Interfaces:**
- Produces: `collectHealthSnapshot(deps, now): Promise<HealthSnapshotV1>`.
- Dependency interface must be injectable: `probeDesktopProcess`, `probeMcpLoopback`, `probeTunnelState`, `probeMachine`.
- Each component includes `state`, `observedAt`, and `evidenceClass`; probe failure maps to `unknown` unless a stronger bounded fact proves `stopped`/`disconnected`.

- [ ] **Step 1: Write RED table tests**

Cases:
- Supervisor connected + Desktop absent => machine reachable, supervisor online, desktop stopped;
- Desktop probe exception => desktop unknown, not stopped;
- Desktop stopped => MCP must not be inferred stopped unless its own probe proves that state;
- tunnel probe unavailable => tunnel unknown, not disconnected;
- stale sample is marked stale by age policy.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test -- health.test.ts`
Expected: FAIL because health collector does not exist.

- [ ] **Step 3: Implement minimal probes**

Production probe constraints:
- machine probe means local Supervisor process is alive and can query bounded OS facts; it is not a general host scan;
- Desktop identity must use exact installed executable/current process identity, not process-name-only matching;
- MCP probe targets the configured loopback MCP endpoint only and has a short bounded timeout;
- tunnel state uses current bounded profile/runtime/lock evidence and never invokes MCP;
- sanitize all error summaries before returning them.

- [ ] **Step 4: Run focused GREEN**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test -- health.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/supervisor
git commit -m "feat(supervisor): report independent health vector"
```

---

### Task 6: Fixed recovery dispatcher with local ownership gates

**Files:**
- Create: `apps/supervisor/src/recovery-dispatcher.ts`
- Create: `apps/supervisor/test/recovery-dispatcher.test.ts`
- Create only if required by RED boundary: `packages/process/src/owned-process-identity.ts` + test
- Extract only if required: process-independent tunnel recovery adapter from current Desktop tunnel modules into a focused runtime-neutral module/package

**Interfaces:**
- Consumes: `RemoteCommandV1`, health collector, current process/tree identity helpers, current tunnel ownership/stale rules.
- Produces: `dispatchRecoveryCommand(command, deps): Promise<CommandResultV1>`.
- Handler map is exhaustive and keyed by `RemoteAction`; there is no dynamic executable/argv/PowerShell text from a command payload.

- [ ] **Step 1: Write RED safety tests**

Required cases:
- foreign same-name Desktop process is refused;
- ambiguous process identity is refused;
- `desktop.start` refuses when owned instance is already healthy;
- `desktop.restart` stops only verified owned tree, starts exact configured executable, then post-verifies;
- `tunnel.restart` uses bounded existing launcher semantics and post-verifies;
- `tunnel.recover_stale` refuses fresh/unverifiable ownership and succeeds only when current stale rules prove reclaim safety;
- unknown/High Risk action is impossible at type/parser boundary and additionally refused defensively.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test -- recovery-dispatcher.test.ts`
Expected: FAIL because dispatcher does not exist.

- [ ] **Step 3: Implement minimal fixed handlers**

Handler shape:

```ts
const handlers: Record<RemoteAction, RecoveryHandler> = {
  'status.refresh': handleStatus,
  'logs.recent': handleRecentLogs,
  'diagnostics.lnwjud': handleDiagnostics,
  'desktop.start': handleDesktopStart,
  'desktop.restart': handleDesktopRestart,
  'tunnel.restart': handleTunnelRestart,
  'tunnel.recover_stale': handleTunnelRecoverStale,
};
```

Rules:
- every mutating handler performs precondition evidence -> action -> post-action verification;
- action timeout is bounded and action-specific;
- output is structured/sanitized; never return full environment, unrestricted command lines, secret file contents, or arbitrary logs;
- if safe extraction from Desktop would import Electron/MCP, duplicate no behavior: instead create a small runtime-neutral adapter and move only the pure semantics with regression coverage.

- [ ] **Step 4: Run focused GREEN + related existing tests**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test && corepack pnpm@10.15.0 --filter @lnwjud/desktop test -- tunnel-controller.test.ts tunnel-lock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/supervisor packages/process apps/desktop/src/main apps/desktop/tests
git commit -m "feat(supervisor): add bounded recovery actions"
```

---

### Task 7: Supervisor composition and minimal Web UI

**Files:**
- Create: `apps/supervisor/src/main.ts`
- Create: `apps/supervisor/test/main.test.ts`
- Create: `apps/remote-control/src/web/index.html`
- Create: `apps/remote-control/src/web/app.ts`
- Create: `apps/remote-control/src/web/styles.css`
- Create: `apps/remote-control/test/web.test.ts`
- Modify: `apps/remote-control/src/server.ts`

**Interfaces:**
- Supervisor main composes config -> credential -> local journal -> health -> dispatcher -> outbound channel and supports graceful SIGTERM/SIGINT close.
- Web App consumes only authenticated service APIs and displays the health vector, freshness, command status, and permitted actions.

- [ ] **Step 1: Write RED composition/UI tests**

Required cases:
- Supervisor can boot with Desktop unavailable using injected fake transport;
- shutdown closes channel/database without starting Electron;
- Web HTML has no terminal/shell/MCP arbitrary console controls;
- High Risk actions render disabled/not present;
- stale/unknown component status is visually distinct from healthy/unhealthy;
- action POST includes only fixed action and bounded parameters.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test -- main.test.ts && corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- web.test.ts`
Expected: FAIL because composition/UI does not exist.

- [ ] **Step 3: Implement minimal composition and Web assets**

Keep Web UI dependency-light: server-render/static HTML + small TypeScript/JS client is sufficient. Do not add a second React/Vite stack unless current build constraints prove it necessary.

- [ ] **Step 4: Run focused GREEN + lint/typecheck**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test && corepack pnpm@10.15.0 --filter @lnwjud/remote-control test && corepack pnpm@10.15.0 lint && corepack pnpm@10.15.0 typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/supervisor apps/remote-control
git commit -m "feat(remote-control): add supervisor runtime and web console"
```

---

### Task 8: Windows bundle and reversible HKCU Run registration

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/electron-builder.yml`
- Modify: `apps/desktop/build/installer.nsh`
- Create: `apps/desktop/scripts/build-supervisor.mjs`
- Create: `apps/desktop/tests/supervisor-packaging.test.ts`
- Modify: `tests/packaging/desktop-packaging.test.ts`
- Modify: `tests/packaging/windows-trust-evidence.test.ts` if Supervisor hashes/evidence must be added

**Interfaces:**
- Produces installed Supervisor bundle under a stable `$INSTDIR` path using packaged private Node runtime or a dedicated bundled executable strategy that does not depend on system Node.
- NSIS `customInstall` writes one HKCU Run value for installed per-user mode; `customUnInstall` removes exactly that value.
- Portable artifact contains no registration side effect and documentation/tests must not claim persistent recovery for portable mode.

- [ ] **Step 1: Write RED packaging tests**

Assertions:
- build creates Supervisor bundle entrypoint;
- electron-builder includes it in installed artifact inputs;
- installer script contains stable quoted `$INSTDIR` command and HKCU Run add/remove pair;
- no HKLM/service/task-scheduler registration exists;
- portable launch path has no auto-registration operation;
- no developer absolute path is embedded.

- [ ] **Step 2: Run RED**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/desktop test -- supervisor-packaging.test.ts && corepack pnpm@10.15.0 test:packaging`
Expected: FAIL because Supervisor packaging/registration is absent.

- [ ] **Step 3: Implement build and NSIS registration**

Use an explicit Run value name such as `lnwjud Supervisor`; command must target packaged private Node + Supervisor bundle using quoted stable install paths. Add/remove must be symmetric and scoped to current user. Do not start Supervisor during installer verification tests.

- [ ] **Step 4: Run focused GREEN + package-source tests**

Run: `corepack pnpm@10.15.0 --filter @lnwjud/desktop test -- supervisor-packaging.test.ts && corepack pnpm@10.15.0 test:packaging`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop tests/packaging pnpm-lock.yaml
git commit -m "feat(supervisor): package per-user recovery runtime"
```

---

### Task 9: End-to-end recovery failure matrix and release gates

**Files:**
- Create: `tests/acceptance/remote-recovery-plane.acceptance.test.ts` or place in the current acceptance directory used by root scripts and update the script explicitly
- Create: `tests/release/remote-recovery-plane.test.ts`
- Modify: `package.json` acceptance command to include the new acceptance file
- Modify: `.github/workflows/ci.yml` only if existing `test:acceptance`/release commands do not automatically include the new test
- Modify: release evidence scripts/tests only when required to prove Supervisor artifact presence
- Modify: `docs/development/PACKAGING_WINDOWS.md` with installed-vs-portable Supervisor behavior and credential location semantics, never credential values

**Interfaces:**
- No new runtime interface. This task proves the design contract on an unchanged candidate.

- [ ] **Step 1: Write RED acceptance/release tests before any gate-specific production adjustment**

Acceptance fixture must run disposable local Remote Control Service + Supervisor processes and fake/fixture Desktop/tunnel probes. Required cases:
1. Supervisor remains connected when Desktop fixture is killed.
2. status distinguishes machine-online / supervisor-online / desktop-stopped.
3. bounded Desktop start/restart executes once and post-verifies.
4. MCP failure does not break Supervisor channel.
5. tunnel failure can be diagnosed/recovered without MCP.
6. foreign/ambiguous process target is refused.
7. expired, replayed, and unauthorized commands are refused.
8. High Risk actions cannot be issued.
9. unique secret markers are absent from all returned logs/audit/results.
10. device revocation drops/rejects subsequent authenticated control.

Release-source test must assert:
- Supervisor package has no Electron/MCP-server dependency;
- no generic shell/free-form command protocol field exists;
- installer registration remains per-user and reversible;
- portable mode has no persistent-registration claim;
- remote service DB path is separate from Desktop DB configuration.

- [ ] **Step 2: Run RED for new acceptance/release tests**

Run: `corepack pnpm@10.15.0 test:acceptance && corepack pnpm@10.15.0 test:release-gate`
Expected: FAIL only for missing newly asserted integration wiring/evidence; unrelated failures must be investigated and not masked.

- [ ] **Step 3: Make only the minimal integration/evidence fixes required by RED**

Do not add new action classes or widen protocol authority during this step.

- [ ] **Step 4: Run focused and full verification on the unchanged candidate**

Run in order:

```text
corepack pnpm@10.15.0 lint
corepack pnpm@10.15.0 typecheck
corepack pnpm@10.15.0 test:release
corepack pnpm@10.15.0 test:acceptance
corepack pnpm@10.15.0 test:integration
corepack pnpm@10.15.0 test:e2e
corepack pnpm@10.15.0 build
corepack pnpm@10.15.0 test:packaging
corepack pnpm@10.15.0 test:release-gate
```

Expected: all commands exit 0. On Windows CI, run the repository Authoritative Release Verification workflow and require success on the exact head SHA before claiming VERIFIED.

- [ ] **Step 5: Fresh base/diff/security review**

Verify:
- `main` SHA has not moved; if it moved, invalidate base freshness and re-assess before completion;
- branch is behind 0 after any approved base update;
- no secret marker/token/provider credential appears in Git diff;
- no High Risk action or generic execution path entered protocol v1;
- Draft PR remains unmerged.

- [ ] **Step 6: Commit final acceptance/evidence work**

```bash
git add tests package.json .github docs/development apps/desktop/scripts apps/desktop/tests
git commit -m "test(remote-control): verify independent recovery plane"
```

---

## Plan Self-Review

### Spec coverage
- Process independence: Tasks 4-8.
- Outbound authenticated channel: Tasks 3-4.
- OIDC operator boundary: Task 3.
- Device enrollment/token hashing/DPAPI: Tasks 2 and 4.
- Dedicated journals/replay protection: Tasks 2 and 4.
- Truthful health vector: Task 5.
- Fixed Normal/Diagnostic/Recovery actions: Tasks 1 and 6.
- High Risk disabled: Tasks 1, 3, 6, 7, 9.
- Web App: Task 7.
- HKCU Run installed mode / portable limitation: Task 8.
- Audit/redaction: Tasks 2, 3, 6, 9.
- Failure matrix, rollback evidence, release verification: Tasks 8-9.

### Placeholder scan
No implementation step uses TBD/TODO or an undefined future placeholder. Any conditional extraction is explicitly triggered only by a RED dependency-boundary test and remains constrained to process-independent semantics.

### Type/interface consistency
`RemoteAction`, `RemoteCommandV1`, `CommandResultV1`, `HealthSnapshotV1`, and protocol version originate only in `@lnwjud/remote-control-contract`. Service and Supervisor consume those definitions rather than redefining them.
