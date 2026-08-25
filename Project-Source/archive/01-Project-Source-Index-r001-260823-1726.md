---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "INDEX-001"
document_type: "PROJECT_SOURCE_INDEX"
semantic_slot: "01"
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
Active slots at bootstrap: `00–17` except reserved `18–19`, plus conditional `40`, `60`, and `91`. Files are revisioned `r001-260823-1726` under `Project-Source/`.

## Task Routing
- Current state / health / next action → `03`
- Decisions → `04`; Requirements → `05`
- Architecture → `06`; Implementation plan → `07`; Issues / drift / conflict → `08`
- Handoff → `09`; Change history → `10`; Actors / Authority → `11` / `12`
- Evidence / Manifest / Actions / Migrations / Secrets → `13`–`17`
- Technical design → `40`; Deployment / operations → `60`; management controls → `91`

## Active Warnings
- Existing implementation working tree was already dirty before Framework bootstrap; it is not part of Framework installation scope.
- Google Drive binding is `VERIFICATION_REQUIRED`; generic non-Drive storage is not configured.

## Current Handoff
See active slot `09`.

## Current Manifest
See active slot `14`.
