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
  | HTTPS authenticated user session
  v
Remote Control Service
  |-- Web UI
  |-- device registry / presence
  |-- command journal / audit
  |-- approval state for allowed remote classes
  |
  | WSS outbound-established device channel
  v
lnwjud Supervisor (separate Node process)
  |-- machine + lnwjud probes
  |-- bounded recovery command dispatcher
  |-- local ownership/safety checks
  |-- DPAPI-protected device credential
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
- fail closed when ownership, target identity, or command authorization cannot be proven.

The Supervisor must not import or bootstrap the Electron main process and must not depend on Desktop IPC.

### 4.2 Remote Control Service

A small self-hostable Node/TypeScript service that provides:

- authenticated Web App/API;
- device registration and current presence;
- WSS device channel termination;
- command creation and delivery;
- command idempotency/replay protection;
- bounded command timeout and expiry;
- append-only operational audit metadata;
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

Rationale:

- current installer is per-user by default;
- the primary requirement is independence from the Desktop process, not pre-login machine administration;
- service installation would widen privilege and installer complexity before evidence shows it is necessary.

The Supervisor bundle is packaged as a separate entrypoint executed by the packaged private Node runtime. Startup registration points to stable installed paths and starts the Supervisor without launching Electron.

The exact Windows registration mechanism should be implemented as a reversible per-user startup entry with install/uninstall coverage. It must not require admin elevation for the MVP path.

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

## 7. Remote action classes

### Normal

Allowed in MVP:

- refresh status;
- request bounded health probes;
- request sanitized recent recovery-plane logs;
- reconnect/reprobe the control channel locally;
- start lnwjud Desktop when exact executable identity is known and no owned instance is running.

### Diagnostic

Allowed in MVP:

- enumerate only process/port facts needed to classify lnwjud Desktop, MCP, and tunnel health;
- inspect tunnel lock/state metadata through bounded parsers;
- collect existing doctor-style signals that do not require MCP to be operational;
- return sanitized version/config-presence facts without returning secret values.

### Recovery

Allowed in MVP after command authentication and local safety checks:

- stop/restart an exact lnwjud-owned Desktop process tree;
- start/restart the Secure MCP Tunnel using existing bounded launcher semantics;
- perform stale tunnel-process/lock recovery only where current ownership/staleness rules can prove safety;
- verify recovery with post-action machine/Desktop/MCP/tunnel probes.

### High Risk

**Disabled remotely in MVP.**

Examples that remain unavailable:

- arbitrary shell/PowerShell execution;
- arbitrary file/config mutation;
- Git reset/rebase/force operations;
- data deletion;
- rollback that changes persistent state compatibility;
- machine reboot/shutdown;
- system-wide service/configuration changes.

Connectivity never implies authority. Adding any High Risk remote action requires a separate design that defines a durable approval mechanism independent of Desktop UI availability.

## 8. Command protocol

Each remote command carries at least:

- `commandId` (globally unique);
- `deviceId`;
- protocol version;
- action type from the fixed allowlist;
- normalized bounded parameters;
- creation timestamp;
- expiry timestamp;
- actor/audit identity from the control service;
- monotonic or replay-resistant delivery metadata.

Supervisor behavior:

1. authenticate the server/channel;
2. validate protocol version;
3. reject expired, duplicate, unknown, or malformed commands;
4. map action to a local fixed handler;
5. run local ownership/authorization/safety checks;
6. record command start evidence;
7. execute with bounded timeout;
8. perform post-action verification;
9. return structured result and sanitized evidence;
10. journal the terminal outcome for duplicate replay handling.

Duplicate `commandId` values must return the prior terminal outcome or a deterministic duplicate response; they must not re-execute a non-idempotent recovery action.

## 9. Authentication and secrets

### Device authentication

- each Supervisor has a unique device identity and secret material;
- initial enrollment produces a device-scoped credential;
- credential at rest on Windows is protected with the existing DPAPI helper or a thin reusable abstraction around it;
- actual credentials never enter Git, Project Source, logs, command payloads, or Web UI;
- device credentials can be revoked server-side.

### User authentication

The Remote Control Service requires authenticated operator access. The concrete provider may remain deployer-configurable, but the implementation must expose an authentication boundary before any device status or command API is reachable.

For MVP, authentication is one operator/control account domain; multi-tenant RBAC is out of scope. Authorization still distinguishes read-only status from action issuance.

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
- command interrupted by reconnect: terminal journal/idempotency rules prevent blind duplicate execution.
- version mismatch: fail closed with explicit upgrade-required state rather than attempting unknown commands.
- ambiguous process ownership: fail closed and report manual intervention required.

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
- Windows packaging/install/uninstall changes for the Supervisor bundle/startup registration;
- focused tests plus release/packaging evidence updates.

The branch must remain independent of other custom feature branches. Integration with Persistent MCP Relay, if desired later, occurs through a separately reviewed interface or integration branch rather than by importing that historical implementation wholesale.

## 14. Verification strategy

### Unit

- command schema/version/expiry validation;
- duplicate/replay behavior;
- action allowlist;
- health state/staleness mapping;
- credential storage abstraction;
- redaction;
- process ownership and bounded parameter validation.

### Integration

- Supervisor connects outbound to test control service;
- authenticated device enrollment/revocation;
- status publication with Desktop stopped;
- permitted command delivery/result journal;
- duplicate command does not re-execute;
- control-channel reconnect preserves outcome semantics.

### Windows recovery acceptance

Prove at minimum:

1. Supervisor remains reachable after Desktop is killed.
2. Supervisor can distinguish machine-online/Supervisor-online/Desktop-stopped.
3. bounded Desktop start/restart succeeds and is post-verified.
4. MCP failure does not break Supervisor connectivity.
5. tunnel failure can be diagnosed/recovered without MCP.
6. ambiguous foreign process ownership is refused.
7. expired/replayed/unauthorized commands are refused.
8. High Risk actions are absent/disabled.
9. secrets do not appear in logs/audit/release artifacts.
10. uninstall removes startup registration and leaves existing user data behavior unchanged unless the user chooses deletion through the existing uninstall path.

### Regression/release

Run affected package tests plus the repository's Windows authoritative release gate before considering the feature a verified candidate. Packaging evidence must prove the Supervisor artifact and reversible startup registration are present in installer/portable expectations as designed.

## 15. Rollout

1. development-only Supervisor + local test control service;
2. authenticated remote status only;
3. Normal/Diagnostic actions;
4. bounded Recovery actions;
5. Windows packaging/startup registration;
6. full recovery failure-matrix acceptance;
7. Draft PR remains unmerged until integration/release strategy explicitly selects it.

Remote action capability should default to the minimum enabled set during early rollout.

## 16. Rollback

Rollback must be possible without changing the upstream-mirror `main` branch:

- disable/revoke device remotely;
- stop Supervisor process;
- remove per-user startup registration;
- remove Supervisor bundle on uninstall/update rollback;
- leave Desktop/MCP local operation functional;
- preserve enough audit evidence to explain the rollback.

No persistent data migration that makes upstream v4.13.0 unable to run is allowed in the MVP design.

## 17. Non-goals

Not in this MVP:

- generic remote shell;
- arbitrary MCP/tool proxying;
- RDP replacement/full desktop streaming;
- multi-tenant SaaS control plane;
- Windows Service/elevated pre-login recovery;
- remote High Risk/destructive operations;
- automatic Codex repair execution;
- Persistent Task Bridge implementation;
- replacing the existing Secure MCP Tunnel data/execution path.

## 18. Design decision summary

The selected MVP deliberately spends complexity on **process independence, bounded authority, replay safety, and truthful health separation**, while deferring generic remote administration and elevated recovery.

This satisfies the intent of REQ-005/REQ-009/REQ-010 without making the control plane a second unrestricted execution engine.
