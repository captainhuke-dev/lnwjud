---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "MANIFEST-001"
document_type: "PROJECT_SOURCE_MANIFEST"
semantic_slot: "14"
revision: 3
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T23:14:56+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
---

# 14 — Project Source Manifest

## Active Documents After Promotion
- `00-Project-Source-Framework-r001-260823-1726.md`
- `01-Project-Source-Index-r003-260823-2310.md`
- `02-Project-Overview-r001-260823-1726.md`
- `03-Current-State-r003-260823-2310.md`
- `04-Decision-Log-r001-260823-1726.md`
- `05-Requirements-r002-260823-2010.md`
- `06-Architecture-r001-260823-1726.md`
- `07-Implementation-Plan-r001-260823-1726.md`
- `08-Open-Issues-r002-260823-2310.md`
- `09-Handoff-r003-260823-2310.md`
- `10-Change-Log-r003-260823-2310.md`
- `11-Actor-Registry-r001-260823-1726.md`
- `12-Authorization-Registry-r003-260823-2310.md`
- `13-Evidence-Registry-r003-260823-2310.md`
- `14-Project-Source-Manifest-r003-260823-2310.md`
- `15-Action-Registry-r003-260823-2310.md`
- `16-Migration-Registry-r001-260823-1726.md`
- `17-Secret-Reference-Registry-r001-260823-1726.md`
- `40-Technical-Design-r002-260823-2010.md`
- `60-Deployment-Plan-r002-260823-2010.md`
- `91-Project-Management-Control-r002-260823-2010.md`

Slots `18–19` are reserved and intentionally absent.

## Continuation-Relevant Formal Drafts
None after successful promotion. During promotion, `drafts/` is transient formal-candidate storage and is not active truth.

## Governed Planned Actions
`ACT-LNW-001` through `ACT-LNW-004` remain `PLANNED`; `ACT-001` remains `DONE`. `ACT-LNW-002` is the routed next work package for `DRIFT-001`, but is not activated by this classification.

## Current Issue / Drift State
- `ISS-001` OPEN.
- `ISS-002` CLOSED after complete legacy-WIP classification.
- `DRIFT-001` OPEN / `STALE_NON_SEMANTIC` / `BASE_STALE` pending governed base update and affected verification.

## Registered Evidence
`EVD-001` through `EVD-014`; `EVD-012` is the 16-path WIP classification, `EVD-013` is the remote base-divergence classification, and `EVD-014` is the bounded persistence/postflight checkpoint.

## Pinned Framework / Schema
- Framework: `1.3.0`
- Schema: `1.0.0`
- Canonical repository: `captainhuke-dev/ProjectFramework`
- Source ref: `main`
- Observed resolved commit: `b5a61e1dd34f3b0676dc9c0f5a2874413630d1db`
- Provenance status: `VERIFIED`

## Required Active Detail Documents
`40`, `60`, and `91` remain active. Classification does not change implementation, runtime, deployment, or management-control semantics beyond routing current drift to the existing rolling-upstream action.

## Historical Revisions
Superseded revisions for slots revised by this classification are retained under `Project-Source/archive/` after promotion.

Manifest does not recursively hash its own raw bytes. Actual secrets are excluded.
