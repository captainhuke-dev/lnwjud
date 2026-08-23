---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "MANIFEST-001"
document_type: "PROJECT_SOURCE_MANIFEST"
semantic_slot: "14"
revision: 1
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T17:36:43+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
---

# 14 — Project Source Manifest

## Active Documents
- `00-Project-Source-Framework-r001-260823-1726.md`
- `01-Project-Source-Index-r001-260823-1726.md`
- `02-Project-Overview-r001-260823-1726.md`
- `03-Current-State-r001-260823-1726.md`
- `04-Decision-Log-r001-260823-1726.md`
- `05-Requirements-r001-260823-1726.md`
- `06-Architecture-r001-260823-1726.md`
- `07-Implementation-Plan-r001-260823-1726.md`
- `08-Open-Issues-r001-260823-1726.md`
- `09-Handoff-r001-260823-1726.md`
- `10-Change-Log-r001-260823-1726.md`
- `11-Actor-Registry-r001-260823-1726.md`
- `12-Authorization-Registry-r001-260823-1726.md`
- `13-Evidence-Registry-r001-260823-1726.md`
- `14-Project-Source-Manifest-r001-260823-1726.md`
- `15-Action-Registry-r001-260823-1726.md`
- `16-Migration-Registry-r001-260823-1726.md`
- `17-Secret-Reference-Registry-r001-260823-1726.md`
- `40-Technical-Design-r001-260823-1726.md`
- `60-Deployment-Plan-r001-260823-1726.md`
- `91-Project-Management-Control-r001-260823-1726.md`

Slots `18–19` are reserved and intentionally absent.

## Continuation-Relevant Formal Drafts
None inside Project Source at bootstrap. Pre-existing implementation WIP remains outside this manifest and is tracked as `ISS-002` until normalized.

## Registered Evidence
`EVD-001` through `EVD-005`; `EVD-005` records the bootstrap completion checkpoint.

## Pinned Framework / Schema
- Framework: `1.3.0`
- Schema: `1.0.0`
- Canonical repository: `captainhuke-dev/ProjectFramework`
- Source ref: `main`
- Observed resolved commit: `b5a61e1dd34f3b0676dc9c0f5a2874413630d1db`
- Provenance status: `VERIFIED`

## Required Active Detail Documents
`40`, `60`, and `91` are active because technical workspace/runtime, deployment/operations, and management-control semantics are materially applicable to lnwjud.

Manifest does not recursively hash its own raw bytes. Actual secrets are excluded.
