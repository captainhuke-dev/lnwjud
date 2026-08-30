# Remote Recovery Plane Design

Date: 2026-08-29
Status: Design candidate for ACT-LNW-004
Target baseline: `main` at `edbc739b6df599e8b824c7c2c75cda1cd9e6d493` (v4.13.0)
Implementation branch: `custom/remote-recovery-plane`

## 1. Purpose

Provide remote status, bounded control, and recovery for a Windows lnwjud host without requiring RDP and without depending on the lnwjud Desktop/MCP execution plane being healthy.

This design implements the historical ACT-LNW-004 responsibility split:

- Web App -> Remote Control Plane
- Supervisor -> Recovery Plane
- lnwjud Desktop/MCP -> Execution Plane
- Persistent Task state -> separate persistence responsibility
- Codex -> diagnostic/repair fallback only when separately authorized

The key invariant is: **the recovery path must remain reachable when lnwjud Desktop, MCP, or the Secure MCP Tunnel is offline or unhealthy.**

## 2. Current-state gap

Current v4.13.0 does not satisfy that invariant:

- Desktop MCP HTTP is loopback-only execution transport.
- `TunnelRuntimeSupervisor` is an in-process runtime helper and therefore shares Desktop process availability.
- Windows packaging produces the Desktop executable and MCP stdio/runtime files but no independently started recovery process.
- Installer hooks do not register a separate Windows service, scheduled task, or equivalent recovery runtime.

The existing components remain useful as recovery adapters, but they cannot themselves be the independent recovery authority.

## 3. Selected architecture

Use a **separate per-user Supervisor process** plus an **outbound authenticated control channel** to a **Remote Control Service** that also serves a small Web App.

```text
Browser
  |
  | HTTPS + OIDC Authorization Code/PKCE
  v
Remote Control Service
  |-- Web UI
  |-- device registry / presence
  |-- command journal / audit
  |-- operator authorization boundary
  |
  | WSS outbound-established device channel
  v
lnwjud Supervisor (separate Node process)
  |-- machine + lnwjud probes
  |-- bounded recovery command dispatcher
  |-- local ownership/safety checks
  |-- DPAPI-protected device credential
  |-- dedicated local command journal
  |
  +--> lnwjud Desktop process
  +--> MCP/loopback health
  +--> Secure MCP Tunnel process/state
  +--> bounded Windows process/port diagnostics

lnwjud Desktop/MCP remains the Execution Plane and is not required for
Supervisor <-> Remote Control Service connectivity.
```

The Remote Control Service is **not** an MCP relay. It must not proxy arbitrary MCP tools, shell commands, filesystem requests, or generic agent execution. Historical Persistent MCP Relay work remains a separate customization concern.

## 4. Components

### 4.1 Supervisor process

A standalone Node entrypoint packaged beside the Desktop runtime, launched independently of Electron after user logon.

Responsibilities:

- establish and maintain outbound authenticated WSS connectivity;
- publish machine reachability and Supervisor liveness;
- probe Desktop, MCP, and tunnel health independently;
- execute a fixed allowlist of bounded recovery commands;
- verify process ownership/identity before stop/restart actions;
- return structured evidence for every command;
- write local sanitized audit events when remote execution is attempted;
- persist command terminal outcomes in a dedicated Supervisor-owned SQLite journal so duplicate delivery remains safe across reconnect/restart;
- fail closed when ownership, target identity, or command authorization cannot be proven.

The Supervisor must not import or bootstrap the Electron main process and must not depend on Desktop IPC. Its SQLite journal is separate from the Desktop database and has an independently versioned schema.

### 4.2 Remote Control Service

A small self-hostable Node/TypeScript service that provides:

- authenticated Web App/API;
- device registration and current presence;
- WSS device channel termination;
- command creation and delivery;
- command idempotency/replay protection;
- bounded command timeout and expiry;
- SQLite-backed device, command, and operational-audit persistence for MVP;
- explicit distinction between machine, Supervisor, Desktop, MCP, and tunnel states.

The service does not possess machine credentials for arbitrary remote execution. It can only issue commands defined by the Supervisor protocol.

### 4.3 Web App

The Web App is served by the Remote Control Service for MVP simplicity.

Minimum views:

- device list and last-seen state;
- machine / Supervisor / Desktop / MCP / tunnel health matrix;
- recent bounded diagnostic evidence;
- permitted Normal / Diagnostic / Recovery actions;
- command progress/result and audit identity;
- explicit disabled state for High Risk actions.

No terminal, generic shell, arbitrary command box, arbitrary path browser, or raw MCP tool console is included in MVP.

## 5. Process independence and startup

MVP uses a **per-user startup registration** rather than a Windows Service.

For the installed NSIS build, the concrete mechanism is an `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` entry owned by lnwjud. The value launches the packaged private Node runtime with the Supervisor bundle through a stable installed path. The NSIS uninstall path removes that value.

Rationale:

- current installer is per-user by default;
- the primary requirement is independence from the Desktop process, not pre-login machine administration;
- HKCU Run is reversible and does not require admin elevation;
- service installation would widen privilege and installer complexity before evidence shows it is necessary.

The Supervisor starts after user logon without launching Electron. It must have its own single-instance guard so repeated startup entries or manual starts cannot create multiple active Supervisors for the same user/device identity.

**Portable mode does not claim persistent remote-recovery availability in MVP.** The portable artifact may contain Supervisor files for packaging consistency, but it does not automatically write a persistent startup entry because the portable path can move. Persistent Supervisor acceptance applies to the installed NSIS mode only.

A later design may promote the Supervisor to a Windows Service if acceptance evidence demonstrates a requirement for pre-login or user-session-independent recovery. That is not part of this MVP.

## 6. Health model

Remote status is a vector, not one aggregate boolean:

```text
machine:     reachable | unreachable | unknown
supervisor:  online | offline | unknown
desktop:     healthy | unhealthy | stopped | unknown
mcp:         healthy | unhealthy | stopped | unknown
tunnel:      connected | disconnected | stopped | unknown
```

Rules:

- never infer Desktop health from Supervisor connectivity;
- never infer machine failure solely from Desktop/MCP/tunnel failure;
- use `unknown` when the Supervisor cannot prove state;
- every state sample carries observed-at time and evidence class;
- stale samples are visibly stale and must not be presented as current.

For MVP, the control service marks device presence stale after 45 seconds without an authenticated Supervisor heartbeat and offline after 90 seconds. These values are configuration constants, not user-facing authority semantics.

## 7. Remote action classes

Protocol v1 exposes only these remote action identifiers:

### Normal

- `status.refresh`
- `logs.recovery.read`
- `desktop.start`

`logs.recovery.read` returns only bounded sanitized Supervisor/recovery events, never arbitrary log-file paths.

### Diagnostic

- `diagnostics.collect`
- `tunnel.status`

`diagnostics.collect` may enumerate only process/port/version/config-presence facts required to classify lnwjud Desktop, MCP, and tunnel health; inspect tunnel lock/state metadata through bounded parsers; and collect doctor-style signals that do not require MCP. Secret values and unrestricted process command lines are excluded.

### Recovery

- `desktop.stop`
- `desktop.restart`
- `tunnel.start`
- `tunnel.stop`
- `tunnel.restart`
- `tunnel.recover_stale`

Recovery actions require command authentication plus local ownership/safety checks. `tunnel.recover_stale` runs only where current ownership/staleness rules prove safety. Every Recovery action performs post-action verification.

### High Risk

**No High Risk action identifier exists in protocol v1.**

Examples intentionally unavailable:

- arbitrary shell/PowerShell execution;
- arbitrary file/config mutation;
- Git reset/rebase/force operations;
- data deletion;
- rollback that changes persistent state compatibility;
- machine reboot/shutdown;
- system-wide service/configuration changes.

Connectivity never implies authority. Adding any High Risk remote action requires a new protocol/design revision with a durable approval mechanism independent of Desktop UI availability.

## 8. Command protocol

Protocol version is `1` for this MVP.

Each remote command carries at least:

- `commandId` (globally unique UUID);
- `deviceId`;
- `protocolVersion: 1`;
- action type from the fixed allowlist above;
- normalized bounded parameters;
- creation timestamp;
- expiry timestamp;
- actor/audit identity from the control service;
- server-issued delivery sequence scoped to the device.

Default command expiry is 60 seconds. The server must not deliver a command after expiry.

Supervisor behavior:

1. authenticate the server/channel;
2. validate protocol version;
3. reject expired, duplicate, unknown, or malformed commands;
4. validate that delivery sequence is newer than the last accepted sequence or corresponds to an already journaled `commandId`;
5. map action to a local fixed handler;
6. run local ownership/authorization/safety checks;
7. record command start evidence;
8. execute with bounded timeout;
9. perform post-action verification;
10. persist the terminal outcome locally before acknowledging completion;
11. return structured result and sanitized evidence.

Duplicate `commandId` values return the prior terminal outcome or a deterministic duplicate response; they must not re-execute a non-idempotent recovery action.

## 9. Authentication and secrets

### Device enrollment/authentication

1. An authenticated operator creates a one-time enrollment code for a device in the Web App.
2. The code is single-use and expires after 10 minutes.
3. The Supervisor submits the code over TLS and receives a random 256-bit device bearer token plus stable `deviceId`.
4. The server stores only a SHA-256 hash of the high-entropy token and compares presented values using constant-time comparison after hashing.
5. The Supervisor stores the token only in a DPAPI-protected file under its user-data directory, using the existing Windows DPAPI helper or a narrow reusable abstraction.
6. Device credentials can be revoked server-side; revocation terminates/invalidates the device channel.

Actual credentials never enter Git, Project Source, logs, command payloads, or Web UI.

### Operator authentication

MVP uses **OpenID Connect Authorization Code flow with PKCE**. The deployment supplies an OIDC issuer and client ID through runtime configuration; no operator password database is implemented by lnwjud.

The control service validates issuer, audience/client ID, signature, expiry, and nonce/state flow before creating an authenticated browser session. Session cookies are Secure, HttpOnly, SameSite=Lax or stricter, and have a bounded lifetime.

MVP supports one configured operator authorization domain. Multi-tenant RBAC is out of scope, but API authorization still distinguishes read-only status endpoints from command-issuance endpoints.

### Transport

- TLS is required for browser and device channels outside loopback;
- Supervisor initiates the remote connection outbound; no inbound listener is opened on the Windows host for remote control;
- reconnect uses bounded exponential backoff with jitter;
- commands are accepted only on an authenticated current channel.

## 10. Audit and evidence

Both sides keep complementary metadata:

Remote service audit:

- actor identity;
- command ID/type/device;
- issued/accepted/completed timestamps;
- terminal status;
- sanitized summary.

Supervisor audit:

- command ID/type;
- local precondition result;
- ownership/safety decision;
- local action result;
- post-action verification result;
- sanitized failure class.

No secret values, raw environment dumps, unrestricted process command lines, or arbitrary file contents are included in normal audit payloads.

## 11. Failure behavior

- Remote Control Service unavailable: Supervisor keeps local recovery capability dormant, retries outbound connection, and does not affect Desktop operation.
- Supervisor unavailable: Web App reports Supervisor offline/stale; it must not claim the machine itself is definitely down without independent evidence.
- Desktop unavailable: Supervisor remains online and can execute allowed bounded recovery actions.
- MCP unavailable: Supervisor must not route recovery through MCP.
- Tunnel unavailable: Supervisor can diagnose/restart the tunnel through local bounded adapters while its own control channel remains separate.
- command interrupted by reconnect: durable local and server command journals prevent blind duplicate execution.
- version mismatch: fail closed with explicit upgrade-required state rather than attempting unknown commands.
- ambiguous process ownership: fail closed and report manual intervention required.
- OIDC unavailable: no new operator session/command issuance is allowed; existing device channels may continue publishing health but cannot gain additional authority.

## 12. Reuse boundaries

Prefer reuse of current code by extracting narrow adapters rather than importing Desktop composition wholesale:

Potential reusable concepts/helpers:

- Windows DPAPI helper;
- tunnel lock/state parsing and stale-state rules;
- tunnel launcher/profile semantics;
- process-tree and executable identity helpers;
- health/doctor primitives that do not require Electron/MCP;
- existing redaction/audit utilities;
- current mutation-safety/ownership rules where their dependencies remain process-independent.

Do not reuse a helper if doing so drags Electron, renderer IPC, Desktop service composition, or MCP server availability into the Supervisor process.

## 13. Repository boundaries

Expected logical additions for implementation planning:

- `apps/supervisor/` — independent Windows recovery agent entrypoint;
- `apps/remote-control/` — Node control service + small Web UI;
- `packages/remote-control-contract/` — shared protocol types/schema with no runtime secrets;
- focused reusable recovery adapters in existing packages only when extraction is required;
- Windows packaging/install/uninstall changes for Supervisor bundle + HKCU Run registration;
- focused tests plus release/packaging evidence updates.

The branch must remain independent of other custom feature branches. Integration with Persistent MCP Relay, if desired later, occurs through a separately reviewed interface or integration branch rather than by importing that historical implementation wholesale.

## 14. Verification strategy

### Unit

- protocol v1 command schema/version/expiry validation;
- duplicate/replay/delivery-sequence behavior;
- action allowlist;
- health state/staleness mapping;
- OIDC session boundary helpers;
- enrollment-code expiry/single-use behavior;
- device-token hashing and DPAPI-backed storage abstraction;
- redaction;
- process ownership and bounded parameter validation.

### Integration

- Supervisor connects outbound to test control service;
- authenticated device enrollment/revocation;
- OIDC-protected status and command API boundary;
- status publication with Desktop stopped;
- permitted command delivery/result journals;
- duplicate command does not re-execute across Supervisor restart;
- control-channel reconnect preserves outcome semantics.

### Windows recovery acceptance

Prove at minimum:

1. installed NSIS Supervisor starts independently after user logon.
2. Supervisor remains reachable after Desktop is killed.
3. Supervisor can distinguish machine-online/Supervisor-online/Desktop-stopped.
4. bounded Desktop start/restart succeeds and is post-verified.
5. MCP failure does not break Supervisor connectivity.
6. tunnel failure can be diagnosed/recovered without MCP.
7. ambiguous foreign process ownership is refused.
8. expired/replayed/unauthorized commands are refused.
9. protocol v1 exposes no High Risk actions.
10. secrets do not appear in logs/audit/release artifacts.
11. uninstall removes the HKCU Run entry and Supervisor files while preserving existing user-data choice semantics.
12. portable mode does not silently install persistent startup state and does not claim persistent recovery availability.

### Regression/release

Run affected package tests plus the repository's Windows authoritative release gate before considering the feature a verified candidate. Packaging evidence must prove the Supervisor artifact and reversible HKCU Run registration are present for the installed build and that portable behavior matches the declared limitation.

## 15. Rollout

1. development-only Supervisor + local test control service;
2. OIDC-authenticated remote status only;
3. device enrollment/revocation;
4. Normal/Diagnostic actions;
5. bounded Recovery actions;
6. NSIS packaging + HKCU Run startup registration;
7. full recovery failure-matrix acceptance;
8. Draft PR remains unmerged until integration/release strategy explicitly selects it.

Remote action capability should default to the minimum enabled set during early rollout.

## 16. Rollback

Rollback must be possible without changing the upstream-mirror `main` branch:

- revoke device remotely;
- stop Supervisor process;
- remove the HKCU Run startup value;
- remove Supervisor bundle on uninstall/update rollback;
- leave Desktop/MCP local operation functional;
- preserve enough audit evidence to explain the rollback.

No persistent data migration that makes upstream v4.13.0 unable to run is allowed in the MVP design. Supervisor and Remote Control Service SQLite schemas are additive custom-state stores and are not required by upstream Desktop startup.

## 17. Non-goals

Not in this MVP:

- generic remote shell;
- arbitrary MCP/tool proxying;
- RDP replacement/full desktop streaming;
- multi-tenant SaaS control plane;
- Windows Service/elevated pre-login recovery;
- portable-mode persistent recovery;
- remote High Risk/destructive operations;
- automatic Codex repair execution;
- Persistent Task Bridge implementation;
- replacing the existing Secure MCP Tunnel data/execution path.

## 18. Design decision summary

The selected MVP deliberately spends complexity on **process independence, bounded authority, replay safety, truthful health separation, and reversible per-user startup**, while deferring generic remote administration and elevated recovery.

This satisfies the intent of REQ-005/REQ-009/REQ-010 without making the control plane a second unrestricted execution engine.
