---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "TECHDESIGN-001"
document_type: "TECHNICAL_DESIGN"
semantic_slot: "40"
revision: 2
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T20:10:00+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "USER_CONFIRMED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
---

# 40 — Technical Design

## Technical Design Scope
Implementation-facing blueprint for the existing lnwjud Windows-first MCP gateway plus approved planned design constraints for `ACT-LNW-001` through `ACT-LNW-004`. Planned sections are governance/design intent only; they do not assert implemented capability.

## Existing Tech Stack Contract
- Windows x64 — primary host platform.
- Node.js `>=24 <25` — required JS runtime for source development; packaged desktop/stdio distributions include their runtime where documented.
- pnpm `10.15.0` — workspace package manager.
- TypeScript `6.0.2` — primary application language/toolchain.
- Electron `43.4.1` — desktop control center runtime as documented by current repository state.
- Vite `7.3.6` — desktop build tooling as documented by current repository state.
- Vitest / ESLint — verification/lint tooling.
- MCP — external agent protocol boundary.
- Windows APIs/COM/WinRT/PowerShell helpers/WSL — capability integrations where applicable.

## Existing System / Component Blueprint
`apps/desktop` orchestrates UI/runtime/tunnel-facing behavior; `packages/mcp-server` exposes tool/protocol surfaces; capability/domain/application/storage/audit/process/workspace/git/filesystem/search/permission packages divide concerns; native helpers extend Windows-specific functionality.

## Existing Development Workspace Contract
- **Canonical Implementation Source:** Git repository `captainhuke-dev/lnwjud`.
- **Local Workspace Binding:** `C:\Users\ADMINS\lnwjud` for environment `WINDOWS_LOCAL_GPT_MCP`, governed by `FRAMEWORK-001`.
- **Workspace Type:** `LOCAL_WORKSPACE`.
- **Workspace Durability:** durable local Git working copy; persistence is Git/filesystem dependent and distinct from runtime state.
- **Human / Agent Edit Location:** bound workspace when authorized.
- **Execution Environment:** Windows host; WSL may be used through scoped adapter when available.
- **Runtime Mutability Boundary:** runtime-only mutation does not become Implementation Truth.
- **Persistent-State Boundary:** runtime data is distinct from source authority.

## Planned Recovery-Plane Invariant — ACT-LNW-001
`Recovery Path MUST NOT depend exclusively on lnwjud.`

A future concrete design must identify an independently reachable control/recovery mechanism, its trust boundary, supported bounded actions, evidence/health signals and escalation path. This revision does not select or implement a transport/provider.

## Planned Rolling Upstream Customization Architecture — ACT-LNW-002
Design intent:
1. Keep an upstream-oriented baseline distinguishable from custom work.
2. Use a controlled customization branch/worktree only after fresh base classification and explicit implementation scope.
3. Treat old custom branches/patches as intent/reference; never blind-merge solely because they existed previously.
4. Compare old upstream, prior custom intent and new upstream; classify each customization as still-required, upstream-resolved, obsolete, conflicted, or requiring redesign.
5. Forward-port only still-valid accepted intent and reverify against current target before integration.

Current Git divergence and `ISS-002` mean no canonical upgrade baseline/worktree is declared by this intake.

## Planned Persistent Task Bridge Architecture — ACT-LNW-003
Core invariant: `GPT Session ≠ Task`.

Planned conceptual components/records include:
- durable Task ID and lifecycle state;
- persisted resumable context and artifact references;
- appendable journal/checkpoints;
- ownership/lease for concurrent-agent exclusion;
- persisted approval/authorization references where required;
- resume reconciliation against actual machine/Git/runtime state before execution;
- an API/Web surface only after persistence authority and security model are defined.

No concrete database/provider/runtime authority is selected in this intake; that remains the first implementation-design decision for the action.

## Planned Remote Control / Recovery Plane Architecture — ACT-LNW-004
Responsibility separation:
```text
GPT Session → Persistent Task
Web App     → Remote Control Plane
Supervisor  → Recovery Plane
lnwjud      → Execution Plane
Codex       → Diagnostic / Repair Fallback
```

Design constraints:
- Supervisor/recovery availability must not collapse with lnwjud execution availability.
- Remote status must distinguish machine reachability, supervisor reachability and lnwjud health.
- Connectivity should use an authenticated outbound-secure model or equivalently bounded architecture; exact provider/protocol remains undecided.
- Normal/diagnostic/recovery/high-risk actions must preserve the authorization boundary in `REQ-010`.

## Plane Separation Contract
Location binding, current Git worktree, Task persistence authority, runtime data authority, remote control plane and recovery plane are separate concepts. Correct routing/location does not itself grant mutation authority.

## Configuration / Secret Contract
Repository configuration and user/runtime settings remain distinct. Secret-bearing runtime keys remain outside Project Source; planned remote/task components may reference secret semantics but actual values must use external secret storage/reference mechanisms.

## Deployment Support Model
`SOURCE_ONLY` remains the current source-governance classification. Planned actions do not establish a Docker deployment contract.

## Related
REQ-002; REQ-003; REQ-005; REQ-006; REQ-007; REQ-008; REQ-009; REQ-010; ACT-LNW-001; ACT-LNW-002; ACT-LNW-003; ACT-LNW-004; ISS-001; ISS-002; RISK-001.

## Verification / Drift Notes
Fresh Git state is required before Material implementation work. Planned architecture is `USER_CONFIRMED` intent, not `VERIFIED` implementation. Runtime/source mismatch expected to align must use existing `DRIFT-*` semantics when material.
