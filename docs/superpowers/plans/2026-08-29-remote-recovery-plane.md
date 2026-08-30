# Remote Recovery Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent per-user Windows Supervisor plus an outbound authenticated Remote Control Service/Web App that remains reachable when lnwjud Desktop/MCP/tunnel is unhealthy and exposes only bounded protocol-v1 recovery actions.

**Architecture:** Add `@lnwjud/remote-control-contract`, a standalone `@lnwjud/supervisor` process, and a separate `@lnwjud/remote-control` service. The Supervisor initiates outbound WSS, stores its 256-bit device token with DPAPI, maintains a dedicated local command journal, performs local health/recovery without Electron/MCP dependencies, and returns sanitized evidence. The service uses OIDC Authorization Code + PKCE, SHA-256 hashes for high-entropy device tokens, a dedicated SQLite database, and a small authenticated Web UI. NSIS-installed mode registers the Supervisor with HKCU Run; portable mode does not claim persistent recovery.

**Tech Stack:** Node.js 24, TypeScript 6.0.2, `node:sqlite`, `ws`, Fastify, Vitest, Electron Builder/NSIS, existing Windows DPAPI/process/audit helpers.

**Spec:** `docs/superpowers/specs/2026-08-29-remote-recovery-plane-design.md`

## Global Constraints

- Work only on `custom/remote-recovery-plane`; baseline is `main@edbc739b6df599e8b824c7c2c75cda1cd9e6d493` until a fresh base check says otherwise.
- Remote Control Service is not an MCP relay. No generic shell, arbitrary MCP/tool proxy, arbitrary filesystem request, free-form executable/argv, reboot, destructive Git/data operation, or other High Risk action may enter protocol v1.
- Exact protocol-v1 actions are: `status.refresh`, `logs.recovery.read`, `desktop.start`, `diagnostics.collect`, `tunnel.status`, `desktop.stop`, `desktop.restart`, `tunnel.start`, `tunnel.stop`, `tunnel.restart`, `tunnel.recover_stale`.
- Supervisor must not import Electron, Desktop IPC, or bootstrap the MCP server.
- Health is a vector (`machine`, `supervisor`, `desktop`, `mcp`, `tunnel`) with `observedAt` and evidence class; ambiguity maps to `unknown`.
- Device presence is stale after 45 seconds without authenticated heartbeat and offline after 90 seconds.
- Operator auth is OIDC Authorization Code + PKCE. Enrollment code is single-use and expires after 10 minutes. Device token is random 256-bit; server stores only SHA-256 hash and compares constant-time; Windows stores token DPAPI-protected.
- Default command expiry is 60 seconds. Commands carry a device-scoped server delivery sequence and durable replay journal on both server and Supervisor.
- Remote service SQLite and Supervisor SQLite are separate from Desktop runtime state authority.
- NSIS installed mode uses reversible `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`; portable mode creates no persistent startup state.
- Every implementation task uses RED -> minimal GREEN -> focused verification -> commit. Final unchanged candidate requires the Windows authoritative release gate.

---

### Task 1: Protocol v1 package

**Files:**
- Create: `packages/remote-control-contract/package.json`
- Create: `packages/remote-control-contract/tsconfig.json`
- Create: `packages/remote-control-contract/src/index.ts`
- Create: `packages/remote-control-contract/src/protocol.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces `REMOTE_CONTROL_PROTOCOL_VERSION = 1`.
- Produces `RemoteAction` with exactly the eleven approved identifiers.
- Produces `RemoteCommandV1`, `CommandResultV1`, `HealthSnapshotV1`, `DeviceHelloV1`, `DeviceWelcomeV1`.
- Produces `parseRemoteCommandV1(value: unknown): RemoteCommandV1` with exact-key validation.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseRemoteCommandV1, REMOTE_ACTIONS } from './index.js';

it('exports only approved actions', () => {
  expect([...REMOTE_ACTIONS]).toEqual([
    'status.refresh', 'logs.recovery.read', 'desktop.start',
    'diagnostics.collect', 'tunnel.status', 'desktop.stop',
    'desktop.restart', 'tunnel.start', 'tunnel.stop',
    'tunnel.restart', 'tunnel.recover_stale',
  ]);
});

it.each(['shell', 'mcp.call', 'file.write', 'system.reboot'])('rejects %s', (action) => {
  expect(() => parseRemoteCommandV1({
    protocolVersion: 1, commandId: crypto.randomUUID(), deviceId: 'dev-1',
    action, actorId: 'operator-1', deliverySequence: 1,
    createdAt: '2026-08-29T09:00:00.000Z', expiresAt: '2026-08-29T09:01:00.000Z',
    parameters: {},
  })).toThrow();
});
```

- [ ] **Step 2: Verify RED**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control-contract test`
Expected: FAIL because package/module is absent.

- [ ] **Step 3: Implement minimal parser/types**
Requirements: protocolVersion must equal 1; UUID command ID; non-empty device/actor IDs; integer deliverySequence >= 1; valid ISO timestamps; `expiresAt > createdAt`; unknown top-level or parameter keys rejected. `logs.recovery.read` alone may accept `{ limit: 1..200 }`; all lifecycle actions use `{}`; `diagnostics.collect` and `tunnel.status` use `{}` in v1.

- [ ] **Step 4: Verify GREEN**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control-contract test && corepack pnpm@10.15.0 typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(remote-control): define bounded protocol v1"`

---

### Task 2: Remote-control SQLite, enrollment, token verification, and server journal

**Files:**
- Create: `apps/remote-control/package.json`
- Create: `apps/remote-control/tsconfig.json`
- Create: `apps/remote-control/src/db.ts`
- Create: `apps/remote-control/src/auth/device-auth.ts`
- Create: `apps/remote-control/src/command-journal.ts`
- Create: `apps/remote-control/test/db.test.ts`
- Create: `apps/remote-control/test/device-auth.test.ts`
- Create: `apps/remote-control/test/command-journal.test.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- `RemoteControlDatabase(filename)` owns only remote-control tables.
- `issueEnrollmentCode(db, label, now): { enrollmentId, code, expiresAt }`.
- `redeemEnrollmentCode(db, enrollmentId, code, now): { deviceId, deviceToken }`.
- `verifyDeviceToken(db, deviceId, token): boolean`; `revokeDevice(db, deviceId): void`.
- `CommandJournal.claim(command)`, `markAccepted`, `commitResult`, `get`.

- [ ] **Step 1: Write failing tests**
Cover: enrollment expires at 10 minutes; redemption is single-use; raw code/token never persists; persisted device token format is exactly `sha256:<hex>`; wrong/revoked token fails; duplicate command ID never inserts a second row; committed result survives DB reopen.

- [ ] **Step 2: Verify RED**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- db.test.ts device-auth.test.ts command-journal.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dedicated schema and SHA-256 token hashing**
Use `node:sqlite` directly. Required tables: `devices`, `enrollments`, `command_journal`, `audit_events`. Generate enrollment code and device token with `randomBytes(32)`. Persist `sha256:${createHash('sha256').update(secret).digest('hex')}` and compare decoded hash buffers using `timingSafeEqual`. Do not reuse Desktop `SqliteDatabase`.

- [ ] **Step 4: Verify GREEN**
Run focused tests above; Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(remote-control): add device and command persistence"`

---

### Task 3: OIDC operator boundary and authenticated device WSS channel

**Files:**
- Create: `apps/remote-control/src/auth/oidc.ts`
- Create: `apps/remote-control/src/device-channel.ts`
- Create: `apps/remote-control/src/server.ts`
- Create: `apps/remote-control/test/oidc.test.ts`
- Create: `apps/remote-control/test/device-channel.test.ts`
- Create: `apps/remote-control/test/server.test.ts`
- Modify: `apps/remote-control/package.json`

**Interfaces:**
- `createRemoteControlServer(options): FastifyInstance`.
- Authenticated operator routes: `GET /api/devices`, `GET /api/devices/:id/status`, `POST /api/devices/:id/commands`, and enrollment creation.
- Device endpoint `/device/ws` requires `deviceId`, bearer token, protocolVersion 1.

- [ ] **Step 1: Write RED tests**
Cover: unauthenticated API -> 401; OIDC state/nonce/issuer/audience/expiry failure -> no session; secure HttpOnly SameSite cookie; unknown/revoked device rejected; protocol mismatch rejected; one current channel per device; heartbeat updates lastSeen; 45s stale / 90s offline mapping; unknown/High Risk command rejected before journal/delivery; duplicate terminal command returns journaled result without second WSS delivery.

- [ ] **Step 2: Verify RED**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/remote-control test -- oidc.test.ts device-channel.test.ts server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement minimal OIDC + WSS service**
Use OIDC Authorization Code + PKCE S256; production config requires issuer/clientId/redirectUri; network exchange lives behind injectable adapter for tests. WSS uses `ws` with `noServer: true`, authenticates before presence registration, and parses all messages via contract schemas.

- [ ] **Step 4: Verify GREEN**
Run focused service tests; Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(remote-control): add authenticated control service"`

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
- Reuse `protectWithWindowsDpapi`/`unprotectWithWindowsDpapi` from `@lnwjud/shared`.
- `SupervisorCommandJournal` persists command state/result and last accepted delivery sequence in its own SQLite DB.
- `ControlChannel` performs outbound WSS handshake, authenticated heartbeat, bounded reconnect, command dispatch, and terminal replay.

- [ ] **Step 1: Write RED tests**
Cover: token file has no plaintext marker; invalid DPAPI envelope fails closed; duplicate committed command after journal reopen does not invoke dispatcher; expired command does not invoke dispatcher; deliverySequence <= last accepted is refused unless commandId is already journaled; reconnect returns prior terminal result; protocol mismatch reports upgrade-required; Supervisor opens no listener.

- [ ] **Step 2: Verify RED**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test`
Expected: FAIL.

- [ ] **Step 3: Implement minimal channel**
Outside test transport, URL must be `wss:`. Reconnect = `min(maxMs, minMs * 2**attempt) + jitter(0..250ms)`. Persist terminal outcome before sending completion. Never log Authorization/device token.

- [ ] **Step 4: Verify GREEN + typecheck**
Run: `corepack pnpm@10.15.0 --filter @lnwjud/supervisor test && corepack pnpm@10.15.0 typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(supervisor): add authenticated outbound control channel"`

---

### Task 5: Truthful independent health vector

**Files:**
- Create: `apps/supervisor/src/health.ts`
- Create: `apps/supervisor/test/health.test.ts`
- Reuse/extract only process-independent helpers as required by RED tests.

**Interfaces:**
- `collectHealthSnapshot(deps, now): Promise<HealthSnapshotV1>` with injected `probeMachine`, `probeDesktop`, `probeMcp`, `probeTunnel`.

- [ ] **Step 1: Write RED table tests**
Cases: Desktop absent proves `desktop=stopped`; Desktop probe error -> `unknown`; MCP state is never inferred from Desktop state; tunnel probe error -> `unknown`; stale sample flagged; machine/supervisor state remains independently truthful.

- [ ] **Step 2: Verify RED**
Run focused Supervisor health test; Expected FAIL.

- [ ] **Step 3: Implement bounded probes**
Desktop matching must use exact executable/process identity, not name alone. MCP targets configured loopback endpoint with bounded timeout. Tunnel reads bounded runtime/profile/lock evidence without MCP. Returned errors are sanitized.

- [ ] **Step 4: Verify GREEN**
Run focused test; Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(supervisor): report independent health vector"`

---

### Task 6: Exhaustive fixed recovery dispatcher

**Files:**
- Create: `apps/supervisor/src/recovery-dispatcher.ts`
- Create: `apps/supervisor/test/recovery-dispatcher.test.ts`
- Create/extract focused process/tunnel adapter only when a RED dependency-boundary test proves current helpers are unusable without Electron/MCP.

**Interfaces:**
- `dispatchRecoveryCommand(command, deps): Promise<CommandResultV1>`.
- Handler map includes all eleven approved actions, exactly once.

- [ ] **Step 1: Write RED safety tests**
Cover: `status.refresh`, `logs.recovery.read`, `diagnostics.collect`, `tunnel.status` are bounded read-only handlers; `desktop.start/stop/restart` require exact owned identity; `tunnel.start/stop/restart` use bounded existing semantics; `tunnel.recover_stale` refuses fresh/unverifiable owner and succeeds only when stale rules prove safety; foreign same-name process refused; every mutating action performs post-verification.

- [ ] **Step 2: Verify RED**
Run focused dispatcher test; Expected FAIL.

- [ ] **Step 3: Implement exhaustive handlers**

```ts
const handlers: Record<RemoteAction, RecoveryHandler> = {
  'status.refresh': handleStatus,
  'logs.recovery.read': handleRecoveryLogs,
  'desktop.start': handleDesktopStart,
  'diagnostics.collect': handleDiagnostics,
  'tunnel.status': handleTunnelStatus,
  'desktop.stop': handleDesktopStop,
  'desktop.restart': handleDesktopRestart,
  'tunnel.start': handleTunnelStart,
  'tunnel.stop': handleTunnelStop,
  'tunnel.restart': handleTunnelRestart,
  'tunnel.recover_stale': handleTunnelRecoverStale,
};
```

No handler accepts executable path, argv, shell text, MCP tool name, arbitrary file path, or raw environment from the remote command.

- [ ] **Step 4: Verify GREEN + related existing tunnel/process tests**
Run Supervisor tests plus current tunnel lock/controller tests; Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(supervisor): add bounded recovery actions"`

---

### Task 7: Supervisor composition and minimal authenticated Web UI

**Files:**
- Create: `apps/supervisor/src/main.ts`
- Create: `apps/supervisor/test/main.test.ts`
- Create: `apps/remote-control/src/web/index.html`
- Create: `apps/remote-control/src/web/app.ts`
- Create: `apps/remote-control/src/web/styles.css`
- Create: `apps/remote-control/test/web.test.ts`
- Modify: `apps/remote-control/src/server.ts`

- [ ] **Step 1: Write RED tests**
Supervisor boots with Desktop unavailable, has single-instance guard, closes channel/DB on signal, and never loads Electron. Web UI requires authenticated API, renders health freshness/unknown distinctly, exposes only approved actions, contains no terminal/shell/MCP arbitrary console, and never renders device token/enrollment secret after redemption.

- [ ] **Step 2: Verify RED**
Run Supervisor main + Web tests; Expected FAIL.

- [ ] **Step 3: Implement minimal composition/UI**
Keep UI dependency-light (static HTML + small client). Do not add another React/Vite application unless a build constraint proves it necessary.

- [ ] **Step 4: Verify GREEN + lint/typecheck**
Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(remote-control): add supervisor runtime and web console"`

---

### Task 8: NSIS Supervisor packaging and reversible HKCU Run

**Files:**
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/electron-builder.yml`
- Modify: `apps/desktop/build/installer.nsh`
- Create: `apps/desktop/scripts/build-supervisor.mjs`
- Create: `apps/desktop/tests/supervisor-packaging.test.ts`
- Modify: `tests/packaging/desktop-packaging.test.ts`
- Modify release trust evidence only if needed to prove Supervisor artifact identity.

- [ ] **Step 1: Write RED packaging tests**
Assert Supervisor bundle exists; installed artifact includes bundle; HKCU Run command uses quoted stable `$INSTDIR` paths and packaged private Node; uninstall deletes exactly that Run value; no HKLM/service/schtasks registration; portable mode has no registration side effect/claim; no developer absolute path embedded.

- [ ] **Step 2: Verify RED**
Run Desktop focused packaging + `test:packaging`; Expected FAIL.

- [ ] **Step 3: Implement bundle and NSIS registration**
Use one Run value, e.g. `lnwjud Supervisor`. Installed mode only. Add/remove symmetry is mandatory. Do not launch Supervisor during packaging tests.

- [ ] **Step 4: Verify GREEN**
Run focused packaging + root packaging tests; Expected PASS.

- [ ] **Step 5: Commit**
`git commit -m "feat(supervisor): package per-user recovery runtime"`

---

### Task 9: Failure-matrix acceptance and authoritative release evidence

**Files:**
- Create acceptance test in the repo's existing acceptance location and add it explicitly to `test:acceptance`.
- Create: `tests/release/remote-recovery-plane.test.ts`
- Modify: `package.json`, release/packaging evidence tests only as required.
- Modify: `docs/development/PACKAGING_WINDOWS.md` for installed-vs-portable behavior and credential-location semantics without secret values.

- [ ] **Step 1: Write RED acceptance/release tests**
Required scenarios: installed Supervisor remains reachable after Desktop fixture kill; machine/supervisor online + desktop stopped is distinguishable; Desktop start/stop/restart execute once and post-verify; MCP failure does not break channel; tunnel status/start/stop/restart/recover-stale work without MCP and respect ownership; foreign/ambiguous target refused; expired/replayed/unauthorized command refused; delivery sequence replay refused; device revocation invalidates channel; unique secret markers absent from logs/audit/results; protocol has no High Risk action; portable mode creates no persistent startup state.

- [ ] **Step 2: Verify RED**
Run: `corepack pnpm@10.15.0 test:acceptance && corepack pnpm@10.15.0 test:release-gate`
Expected: FAIL only on missing newly asserted wiring/evidence; unrelated failures are investigated, never masked.

- [ ] **Step 3: Make only minimal integration/evidence fixes**
No new action identifiers or authority expansion is allowed.

- [ ] **Step 4: Run full unchanged-candidate verification**

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

Then require GitHub Authoritative Release Verification (Windows) success on the exact head SHA.

- [ ] **Step 5: Fresh base/diff/security check**
Confirm `main` has not moved; branch behind count is 0; no secret/provider credential exists in diff; no High Risk/free-form execution path entered protocol; Draft PR remains unmerged.

- [ ] **Step 6: Commit**
`git commit -m "test(remote-control): verify independent recovery plane"`

---

## Plan Self-Review

- Spec action list matches exactly: 11 identifiers, including `desktop.stop`, `tunnel.status`, `tunnel.start`, and `tunnel.stop`; deprecated draft names `logs.recent` and `diagnostics.lnwjud` are absent.
- Device-token persistence matches approved spec: random 256-bit token, SHA-256 server hash, constant-time compare, DPAPI Windows storage.
- 45s stale / 90s offline presence, 10-minute enrollment expiry, 60-second command expiry, delivery sequence, and durable dual journals are covered.
- Process independence, OIDC, Web UI, audit/redaction, bounded recovery, HKCU Run installed mode, portable limitation, rollback-safe packaging, and final Windows release verification each map to a task.
- Shared protocol types originate only in `@lnwjud/remote-control-contract`; service and Supervisor consume them rather than redefining them.
- No TBD/TODO, generic execution placeholder, or unresolved provider/runtime authority remains in the implementation steps.
