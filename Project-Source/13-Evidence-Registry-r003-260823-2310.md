---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "EVDREG-001"
document_type: "EVIDENCE_REGISTRY"
semantic_slot: "13"
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

# 13 — Evidence Registry

## EVD-001 — Canonical Framework distribution identity
- **Evidence Type:** REMOTE_GIT_AND_RELEASE_DESCRIPTOR_OBSERVATION
- **Captured At:** 2026-08-23T17:26:38+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** `captainhuke-dev/ProjectFramework` main; `FRAMEWORK-RELEASE.yaml`
- **Artifact Path:** external canonical source
- **Artifact Hash:** Git commit `b5a61e1dd34f3b0676dc9c0f5a2874413630d1db`
- **Supports:** FRAMEWORK-001; DEC-001; REQ-001; DEP-001
- **Epistemic Status:** VERIFIED

## EVD-002 — lnwjud repository/local workspace identity
- **Evidence Type:** LOCAL_GIT_AND_WORKSPACE_OBSERVATION
- **Captured At:** 2026-08-23T17:26:38+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** local Git remote/status + MCP workspace registration
- **Artifact Path:** `C:\Users\ADMINS\lnwjud`
- **Artifact Hash:** observed pre-bootstrap HEAD `0092c709c39b935b97c849eab31575256b0d1afd`
- **Supports:** FRAMEWORK-001; DEC-002; REQ-002
- **Epistemic Status:** VERIFIED

## EVD-003 — Pre-existing working-tree state
- **Evidence Type:** GIT_STATUS_OBSERVATION
- **Captured At:** 2026-08-23T17:26:38+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** `git status --short --branch` before Project Source creation
- **Artifact Path:** repository working tree outside `Project-Source/`
- **Artifact Hash:** NOT_APPLICABLE
- **Supports:** REQ-004; ISS-002; RISK-001
- **Epistemic Status:** VERIFIED

## EVD-004 — User explicit approval
- **Evidence Type:** USER_INSTRUCTION
- **Captured At:** 2026-08-23T17:25:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** ChatGPT Project conversation: approval to proceed after installation Preview
- **Artifact Path:** source-native conversation context
- **Artifact Hash:** NOT_APPLICABLE
- **Supports:** DEC-001; DEC-002; AUTH-001; ACT-001
- **Epistemic Status:** USER_CONFIRMED

## EVD-005 — Framework bootstrap completion checkpoint
- **Evidence Type:** STRUCTURAL_AND_GIT_SCOPE_VERIFICATION
- **Captured At:** 2026-08-23T17:36:43+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** Project Source structural checks; `git diff --cached --check`; `git show ff13a92ce420b72799366b8043470feb96ad2c0b`
- **Artifact Path:** `Project-Source/`
- **Artifact Hash:** completion content commit `ff13a92ce420b72799366b8043470feb96ad2c0b`
- **Supports:** ACT-001; GATE-001; REQ-001; REQ-004
- **Epistemic Status:** VERIFIED

## EVD-006 — User approval for task-portfolio persistence
- **Evidence Type:** USER_INSTRUCTION
- **Captured At:** 2026-08-23T20:10:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** ChatGPT Project conversation: approval of the Persistence Preview and bounded Project Source write.
- **Artifact Path:** source-native conversation context
- **Artifact Hash:** NOT_APPLICABLE
- **Supports:** AUTH-002; CHG-003; ACT-LNW-001; ACT-LNW-002; ACT-LNW-003; ACT-LNW-004
- **Epistemic Status:** USER_CONFIRMED

## EVD-007 — Prepared initiative handoff and approved normalization mapping
- **Evidence Type:** SOURCE_HANDOFF_AND_APPROVED_PREVIEW
- **Captured At:** 2026-08-23T20:10:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** Prepared/not-yet-persisted lnwjud initiative handoff supplied in this Project conversation and the approved Persistence Preview.
- **Artifact Path:** source-native conversation/file context
- **Artifact Hash:** NOT_APPLICABLE
- **Supports:** REQ-005; REQ-006; REQ-007; REQ-008; REQ-009; REQ-010; ACT-LNW-001; ACT-LNW-002; ACT-LNW-003; ACT-LNW-004
- **Epistemic Status:** USER_CONFIRMED

## EVD-008 — Persistence preflight Git observation
- **Evidence Type:** LOCAL_AND_REMOTE_GIT_OBSERVATION
- **Captured At:** 2026-08-23T20:10:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** fresh local branch/HEAD/status and remote `refs/heads/main` observation performed before mutation.
- **Artifact Path:** `C:\Users\ADMINS\lnwjud`
- **Artifact Hash:** local HEAD `d940e212ad6f2e0cb4c0ebb83a798ec2a3716582`; remote main `7e67ac7cea4fc847c545de4b9ff9634276059b12`
- **Supports:** REQ-002; REQ-004; ISS-002; AUTH-002
- **Epistemic Status:** VERIFIED

## EVD-009 — Task-portfolio candidate and promoted-state verification
- **Evidence Type:** STRUCTURAL_CONTENT_AND_SECRET_PATTERN_VERIFICATION
- **Captured At:** 2026-08-23T20:18:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** Candidate/promoted Project Source checks performed during task-portfolio persistence.
- **Artifact Path:** `Project-Source/`
- **Artifact Hash:** NOT_APPLICABLE
- **Observed Result:** 12 active `r002` files; 0 remaining `r002` drafts; 12 required prior revisions archived; 0 bad status/revision records; 0 reserved `18–19` files; 4 authoritative `ACT-LNW-*` definitions; 6 authoritative `REQ-005..010` definitions; 0 token-like secret-value pattern hits.
- **Supports:** AUTH-002; CHG-003; ACT-LNW-001; ACT-LNW-002; ACT-LNW-003; ACT-LNW-004; REQ-005; REQ-006; REQ-007; REQ-008; REQ-009; REQ-010
- **Epistemic Status:** VERIFIED

## EVD-010 — Task-portfolio persistence Git checkpoint
- **Evidence Type:** GIT_SCOPE_AND_PRESERVATION_VERIFICATION
- **Captured At:** 2026-08-23T20:18:00+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** `git diff --cached --check -- Project-Source`; path-scoped commit; `git show --name-only ee1b03cf8ec278752b8e2bcc3e109d92979c98f9`; post-commit `git status`.
- **Artifact Path:** `Project-Source/`
- **Artifact Hash:** content checkpoint commit `ee1b03cf8ec278752b8e2bcc3e109d92979c98f9`
- **Observed Result:** Commit contains only 24 `Project-Source/` paths; unrelated pre-existing implementation WIP remains present as 16 status paths outside Project Source.
- **Supports:** AUTH-002; CHG-004; REQ-004; ACT-LNW-001; ACT-LNW-002; ACT-LNW-003; ACT-LNW-004
- **Epistemic Status:** VERIFIED

## EVD-011 — User instruction to correct Health classification causes
- **Evidence Type:** USER_INSTRUCTION
- **Captured At:** 2026-08-23T23:10:16+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** Current ChatGPT Project conversation: user instructed "แก้" for `ISS-002` OPEN, unnormalized 16-path WIP, and unclassified local/remote semantic divergence.
- **Artifact Path:** source-native conversation context
- **Artifact Hash:** NOT_APPLICABLE
- **Supports:** AUTH-003; CHG-005; ISS-002; DRIFT-001
- **Epistemic Status:** USER_CONFIRMED

## EVD-012 — Legacy 16-path working-tree classification
- **Evidence Type:** LOCAL_GIT_DIFF_SOURCE_AND_ARTIFACT_CLASSIFICATION
- **Captured At:** 2026-08-23T23:10:16+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** fresh `git_status`; staged and unstaged Git diffs; source inspection of STDIO `--reset-workspaces`; index/HEAD object-ID and normalized-diff checks; extracted tunnel-client metadata/hash inspection.
- **Artifact Path:** working tree outside `Project-Source/`
- **Artifact Hash:** NOT_APPLICABLE
- **Observed Result:** Raw 16 status paths normalize to 6 code/test legacy-WIP paths in two overlapping clusters; 1 incidental `pnpm-lock.yaml` metadata path; 2 content-clean status-noise paths with matching HEAD/index OIDs and empty normalized diff; 7 untracked files forming one OpenAI tunnel-client v0.0.12 Windows amd64 extracted distribution with common extraction timestamp, cloudflared 2026.7.2 metadata, licenses/SPDX and binaries. Tunnel-client executable SHA-256 observed as `6649169733686805CA16CCCD91774594D0C017FD729C37AD4CE1CD18323D9AE8`.
- **Supports:** ISS-002; REQ-004; ACT-LNW-001; ACT-LNW-002
- **Epistemic Status:** VERIFIED

## EVD-013 — Remote implementation-base divergence classification
- **Evidence Type:** REMOTE_GIT_COMPARE_AND_LOCAL_WIP_OVERLAP_ANALYSIS
- **Captured At:** 2026-08-23T23:10:16+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** GitHub compare API for `0092c709c39b935b97c849eab31575256b0d1afd...7e67ac7cea4fc847c545de4b9ff9634276059b12` plus fresh local WIP path set.
- **Artifact Path:** external bound GitHub repository + local working tree
- **Artifact Hash:** merge-base `0092c709c39b935b97c849eab31575256b0d1afd`; remote main `7e67ac7cea4fc847c545de4b9ff9634276059b12`
- **Observed Result:** GitHub reports `status=ahead`, `ahead_by=2`, `behind_by=0`; commits are `2e19e578...` release v4.8.4 and `7e67ac7...` release v4.8.5 configurable wait windows; 45 remote files changed; direct overlap with 9 tracked WIP-status paths is zero. Current legacy WIP is classified `STALE_NON_SEMANTIC`; workflow remains `BASE_STALE` until governed update and affected verification.
- **Supports:** DRIFT-001; REQ-002; REQ-006; ACT-LNW-002
- **Epistemic Status:** VERIFIED

## EVD-014 — Legacy-WIP classification persistence checkpoint
- **Evidence Type:** PROJECT_SOURCE_GIT_SCOPE_AND_POSTFLIGHT_VERIFICATION
- **Captured At:** 2026-08-23T23:14:56+07:00
- **Captured By Actor / Instance:** ACTOR-002 / INST-001
- **Source Reference:** candidate validation; base-hash check; promoted-state validation; git diff --cached --check -- Project-Source; path-scoped commit; git show --name-only 4afeadcbcd2258c73751596a342da487992e0574; post-commit git status.
- **Artifact Path:** Project-Source/
- **Artifact Hash:** classification content commit `4afeadcbcd2258c73751596a342da487992e0574`
- **Observed Result:** Nine active classification revisions promoted; nine prior active revisions archived; commit scope contains only 18 Project-Source paths (9 active revisions plus 9 archive-preserving renames); original raw 16-path implementation status remains outside the commit; ISS-002 is CLOSED; DRIFT-001 remains OPEN / BASE_STALE.
- **Supports:** AUTH-003; CHG-006; ISS-002; DRIFT-001; REQ-002; REQ-004; ACT-LNW-002
- **Epistemic Status:** VERIFIED
Never store actual secrets as evidence.
