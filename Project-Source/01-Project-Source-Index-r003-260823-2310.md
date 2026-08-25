---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "INDEX-001"
document_type: "PROJECT_SOURCE_INDEX"
semantic_slot: "01"
revision: 3
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T23:10:16+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
compatible_framework_range: ">=1.0,<2.0"
compatible_schema_range: ">=1.0,<2.0"
---

# 01 — Project Source Index

## Project Identity
- Project: `LNWJUD` / `lnwjud`
- Root governance: `FRAMEWORK-001`
- Framework pin: `1.3.0`; Schema `1.0.0`

## Bootstrap Read Order
`00 → 01 → 03`, then route from this index to the relevant canonical document.

## Active Document Registry
Active slots are `00–17` except reserved `18–19`, plus `40`, `60`, and `91`. Current exact filenames are authoritative in active slot `14`.

## Task Routing
- Current state / health / next action → `03`
- Decisions → `04`; Requirements → `05`
- Architecture → `06`; Implementation plan → `07`; Issues / drift / conflict → `08`
- Handoff → `09`; Change history → `10`; Actors / Authority → `11` / `12`
- Evidence / Manifest / Actions / Migrations / Secrets → `13`–`17`
- Technical design → `40`; Deployment / operations → `60`; management controls → `91`

## Governed Planned Action Portfolio
- `ACT-LNW-001` — Out-of-Band lnwjud Recovery
- `ACT-LNW-002` — Rolling Upstream Upgrade + Custom Branch/WorkTree
- `ACT-LNW-003` — Persistent Task Bridge Web App
- `ACT-LNW-004` — lnwjud Web Remote Control Plane + Supervisor

All four remain `PLANNED`; persistence or classification does not authorize implementation.

## Active Warnings
- `ISS-002` legacy-WIP knowledge debt is classified and closed. Raw Git status still reports 16 paths, but the semantics are now normalized: 6 code/test legacy-WIP paths, 1 incidental lockfile-metadata path, 2 content-clean status-noise paths, and 7 extracted external tunnel-client distribution artifacts.
- Current implementation base is `BASE_STALE` and materialized as `DRIFT-001`. GitHub compare shows remote `main` `7e67ac7cea4fc847c545de4b9ff9634276059b12` is two commits ahead of implementation merge-base `0092c709c39b935b97c849eab31575256b0d1afd`; 45 remote files changed and direct overlap with the 9 tracked WIP-status paths is zero. Classification for the current legacy WIP is `STALE_NON_SEMANTIC`; affected verification is still required after a governed base update before returning to `FRESH`.
- Google Drive binding is `VERIFICATION_REQUIRED`; generic non-Drive storage is not configured.

## Current Handoff
See active slot `09`.

## Current Manifest
See active slot `14`.
