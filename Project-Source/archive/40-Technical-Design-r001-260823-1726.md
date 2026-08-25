---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "TECHDESIGN-001"
document_type: "TECHNICAL_DESIGN"
semantic_slot: "40"
revision: 1
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T17:26:38+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
---

# 40 — Technical Design

## Technical Design Scope
Implementation-facing blueprint for the existing lnwjud Windows-first MCP gateway, desktop runtime, local workspace and source/runtime authority boundaries.

## Tech Stack Contract
- Windows x64 — primary host platform.
- Node.js `>=24 <25` — required JS runtime for source development; packaged desktop/stdio distributions include their runtime where documented.
- pnpm `10.15.0` — workspace package manager.
- TypeScript `6.0.2` — primary application language/toolchain.
- Electron `43.4.1` — desktop control center runtime as documented by current README.
- Vite `7.3.6` — desktop build tooling as documented by current README.
- Vitest / ESLint — verification/lint tooling.
- MCP — external agent protocol boundary.
- Windows APIs/COM/WinRT/PowerShell helpers/WSL — capability integrations where applicable.

## System / Component Blueprint
`apps/desktop` orchestrates UI/runtime/tunnel-facing behavior; `packages/mcp-server` exposes tool/protocol surfaces; capability/domain/application/storage/audit/process/workspace/git/filesystem/search/permission packages divide concerns; native helpers extend Windows-specific functionality.

## Source Structure Blueprint
- `apps/` — executable application surfaces.
- `packages/` — reusable domain/capability/runtime modules.
- `native/` — native Windows helpers.
- `tests/` — integration/packaging/release verification.
- `scripts/` — repository operational/build/release helpers.
- `docs/` — architecture, MCP and operating knowledge.

## Development Workspace Contract
- **Canonical Implementation Source:** Git repository `captainhuke-dev/lnwjud`, based on observed origin and repository content.
- **Local Workspace Binding:** `C:\Users\ADMINS\lnwjud` for environment `WINDOWS_LOCAL_GPT_MCP`, governed by `FRAMEWORK-001`.
- **Workspace Type:** `LOCAL_WORKSPACE`.
- **Workspace Durability:** durable local Git working copy; persistence is Git/filesystem dependent and distinct from runtime state.
- **Human / Agent Edit Location:** bound workspace when authorized.
- **Execution Environment:** Windows host; WSL may be used through scoped adapter for Linux-side commands.
- **Source-to-Runtime Mapping:** build/direct execution depending on app/package; packaged desktop and stdio launcher are derived runtime artifacts.
- **Dependency Isolation:** pnpm workspace/node_modules contract.
- **Runtime Mutability Boundary:** runtime may create local state/logs/tasks/config outside source; runtime-only mutation does not become Implementation Truth.
- **Persistent-State Boundary:** local SQLite/task/config/backup state is runtime data and is not automatically source authority.

Generic external File Storage Binding is absent at bootstrap; Google Drive remains unresolved. Neither may be inferred as implementation authority.

## Configuration Contract
Repository configuration and user/runtime settings are distinct. Secret-bearing runtime keys remain external/DPAPI-protected where supported; Project Source records reference semantics only.

## Runtime Requirements
Windows x64 for desktop/native capabilities; local filesystem and process access per selected permission profile; network access for Secure MCP Tunnel/update/repository operations as applicable; loopback HTTP for local MCP mode.

## Deployment Support Model
`SOURCE_ONLY` for governance classification of current repository development; packaged Windows installer/artifacts are produced from source. No Docker deployment contract is established by current evidence.

## Source / Docker Architecture
Source/package architecture is verified. Docker mode is `NOT_APPLICABLE` based on current repository documentation inspected during bootstrap; re-evaluate if deployment scope changes.

## Related
REQ-002; REQ-003; DEC-002; ISS-001; ISS-002; RISK-001.

## Verification / Drift Notes
Fresh Git state is required before Material work. Runtime/source mismatch expected to align must be recorded as `DRIFT-*`; MCP workspace IDs or runtime handles are routing evidence, not canonical source identity.
