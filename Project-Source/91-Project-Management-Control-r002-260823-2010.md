---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "PMCTRL-001"
document_type: "PROJECT_MANAGEMENT_CONTROL"
semantic_slot: "91"
revision: 2
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T20:10:00+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "CHANGEABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
---

# 91 — Project Management Control

## RISK-001 — Bootstrap commit contamination
- **Risk Statement:** Existing staged/unstaged/untracked implementation WIP could be accidentally mixed into the ProjectFramework bootstrap commit.
- **Category:** VERSION_CONTROL / SCOPE
- **Probability:** MEDIUM before mitigation
- **Impact:** HIGH because unrelated implementation intent/history could be misrepresented.
- **Trigger / Early Warning:** Git diff/commit includes any path outside `Project-Source/`.
- **Mitigation:** Path-scoped verification and commit; no reset/clean; compare post-bootstrap WIP against EVD-003.
- **Contingency:** Stop before commit or revert only the bootstrap commit through governed Git recovery if contamination is detected.
- **Owner:** ACTOR-002 for bootstrap execution; ACTOR-001 accountable.
- **Review Trigger:** Before bootstrap commit and after commit.
- **Status:** CLOSED
- **Related:** REQ-004; ACT-001; EVD-003; GATE-001

## DEP-001 — Canonical ProjectFramework source
- **Dependency Type:** GOVERNANCE_SOURCE
- **Depends On:** `captainhuke-dev/ProjectFramework` canonical `main` and readable Framework 1.3.0 distribution sources.
- **Required For:** Initial bootstrap and future approved Framework upgrades.
- **Owner:** External canonical repository; project consumes read-through.
- **Current State:** AVAILABLE and observed at `b5a61e1dd34f3b0676dc9c0f5a2874413630d1db` for this bootstrap.
- **Fallback:** No silent reconstruction from memory; affected governance mutation stops if required canonical source is unreadable.
- **Failure Impact:** BLOCKED for affected Framework creation/upgrade.
- **Status:** AVAILABLE
- **Related:** EVD-001; DEC-001

## GATE-001 — Initial Framework bootstrap completion
- **Purpose:** Ensure Project Source is valid, scoped and durably committed before marking `ACT-001` DONE.
- **Affected Scope:** `Project-Source/` initial creation.
- **Entry Criteria:** User approval; canonical Framework source resolved; root `FRAMEWORK-001` created first.
- **Pass Criteria:** Mandatory + approved conditional documents present; slots `18–19` absent; coherent identity/version/inheritance; no material unresolved placeholders in active Project facts; secret-value checks pass; Git diff/commit path is only `Project-Source/`; pre-existing WIP remains; completion commit observed.
- **Required Evidence:** EVD-001 through EVD-005.
- **Review Owner:** ACTOR-002 / INST-001
- **Required Authority:** AUTH-001
- **Status:** PASS
- **Findings:** Structural/integrity checks passed; path-scoped content commit contained only `Project-Source/`; pre-existing implementation WIP remained outside the commit.
- **Exception / Waiver:** NONE
- **Next Action:** NONE for bootstrap.
- **Reviewed At:** 2026-08-23T17:36:43+07:00

## Task-Portfolio Control Intake — not materialized as Stable IDs
The approved initiative handoff mentions future risks/dependencies/gates, but this intake intentionally does **not** create new `RISK-*`, `DEP-*`, or `GATE-*` identities unless Framework minimum semantics are sufficiently known. Current routing is:

| Candidate concern | Current canonical treatment | Future trigger for formal control object |
| --- | --- | --- |
| Recovery path must not depend exclusively on lnwjud | `REQ-005` + planned `40/60` contract | Formalize when concrete recovery mechanism exposes assessable probability/impact/dependency/gate semantics |
| Upgrade regression/stable promotion | `REQ-006` + planned `60` flow | Formalize gate when ACT-LNW-002 is activated and review owner/evidence/pass criteria are scoped |
| Concurrent task collision | `REQ-008` | Formalize risk if implementation design establishes a material exposure with owner/probability/impact/mitigation |
| Supervisor/control-channel availability | `REQ-009` | Formalize dependency/risk when concrete provider/topology is selected |
| Remote destructive-action approval | `REQ-010` + planned `60` action classes | Formalize gate when operational authority and review evidence are scoped |

No `ASM-*`, `MS-*`, `OUT-*`, or `CR-*` records are added by this task intake. Planning prose remains non-authoritative for those object families until minimum semantics are available.
