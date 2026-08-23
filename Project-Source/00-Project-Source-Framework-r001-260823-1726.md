---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "FRAMEWORK-001"
document_type: "PROJECT_SOURCE_FRAMEWORK"
semantic_slot: "00"
revision: 1
document_status: "ACTIVE"
framework_root: true
inherits_from: []
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T17:26:38+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "USER_CONFIRMED"
freshness_class: "STABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
compatible_framework_range: ">=1.0,<2.0"
compatible_schema_range: ">=1.0,<2.0"
---

# 00 โ€” Project Source Framework

> **Root Governance / Non-Removable Framework:** เน€เธญเธเธชเธฒเธฃเธเธตเนเธเธทเธญเธเธเธชเธนเธเธชเธธเธ”เธ เธฒเธขเนเธ Project Source เนเธฅเธฐเน€เธเนเธ Root Governance เธเธญเธ Project เธเธตเน เธ—เธธเธ AI/Agent เธ•เนเธญเธเธญเนเธฒเธ `00 โ’ 01 โ’ 03` เธเนเธญเธเน€เธฃเธดเนเธกเธเธฒเธ เธ—เธธเธ Project Source artifact เธ—เธตเนเธชเธฃเนเธฒเธเธซเธฅเธฑเธเธเธฒเธเธเธตเน inherit เธเธฒเธ `FRAMEWORK-001`. เธซเนเธฒเธกเธฅเธ, bypass, demote, replace เธ”เนเธงเธข child rule เธซเธฃเธทเธญเธเธฅเนเธญเธขเนเธซเน Framework เนเธกเนเธกเธต Active revision. เธเธฒเธฃเนเธเน Framework เธ•เนเธญเธเธกเธต User Explicit Approval เนเธฅเธฐเนเธเน revision/supersede/archive flow.

## 1. Framework Authority, Inheritance, and Precedence

### 1.1 Root Invariant

```yaml
framework_document_id: "FRAMEWORK-001"
framework_root: true
inherits_from: []
```

Project Source เธ—เธตเนเนเธกเนเธกเธต Active `FRAMEWORK-001` เธ–เธทเธญเธงเนเธฒ:

```text
INVALID + NOT_OPERATIONALLY_READY
```

เธซเนเธฒเธก descendant artifact/rule:

- เธฅเธเธซเธฃเธทเธญเธขเนเธฒเธข Framework เธญเธญเธเธเธฒเธ semantic slot `00`
- bypass bootstrap เธ—เธตเนเน€เธฃเธดเนเธกเธเธฒเธ `00`
- demote Framework เธ•เนเธณเธเธงเนเธฒ child rule
- replace Framework เธ”เนเธงเธข Project-Specific Rule, Handoff, Task, Prompt เธซเธฃเธทเธญ Agent instruction
- weaken/contradict Framework invariant เธเนเธฒเธ child override

### 1.2 Inheritance Contract

Governed Markdown descendants declare:

```yaml
inherits_from:
  - "FRAMEWORK-001"
```

Non-Markdown Project Source artifacts inherit เธเนเธฒเธ canonical Registry/Manifest entry. Implementation artifacts เน€เธเนเธ source code/config/runtime เนเธกเนเธเธณเน€เธเนเธเธ•เนเธญเธเธเธฑเธ YAML inheritance เนเธ•เนเธขเธฑเธเธญเธขเธนเนเนเธ•เน Framework เธเนเธฒเธ Project identity + related `REQ-*` / `DEC-*` / `AUTH-*` / `ACT-*` เนเธฅเธฐ governance workflow.

Descendants may extend/specialize/add constraints เนเธ•เนเธซเนเธฒเธกเธฅเธ”เธ—เธญเธ Root Framework. เธซเธฒเธเธ•เนเธญเธเน€เธเธฅเธตเนเธขเธ Root invariant เธ•เนเธญเธเนเธเน `FRAMEWORK-001` เนเธ”เธขเธ•เธฃเธเธเนเธฒเธ User Approval เนเธฅเธฐ preserve history.

### 1.3 Authority Order

```text
0. User Explicit Instruction / Approval
1. 00 Project Source Framework
2. Framework-compliant Project-Specific Rules
3. Canonical Project Source documents / Decisions / Requirements
4. Task / Handoff / Prompt / Agent Instruction
```

## 2. Project Identity

```yaml
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"   # immutable
project_id: "LNWJUD"       # stable human-readable ID
project_name: "lnwjud"   # mutable display name
```

Rename เธซเนเธฒเธกเน€เธเธฅเธตเนเธขเธ `project_uuid`. Merge/Split เธ•เนเธญเธ preserve lineage เนเธเธ reconstructable.

### 2.1 Project Location Binding

Active local `FRAMEWORK-001` เน€เธเนเธ canonical governance home เธเธญเธ **Project Location Binding** เธชเธณเธซเธฃเธฑเธ routing เธเนเธฒเธก connector. `03 Current State` เนเธฅเธฐ `09 Handoff` เธญเนเธฒเธเธญเธดเธ binding เธเธตเนเนเธ”เน เนเธ•เนเธซเนเธฒเธกเน€เธเนเธ authoritative copy เนเธขเธเธ•เนเธฒเธเธซเธฒเธ.

```yaml
project_location_binding:
  github:
    binding_state: "BOUND"
    repository: "captainhuke-dev/lnwjud"
    repository_url: "https://github.com/captainhuke-dev/lnwjud.git"
    project_source_path: "Project-Source/"
    verification_status: "VERIFIED"
    last_verified_at: "2026-08-23T17:26:38+07:00"

  google_drive:
    binding_state: "VERIFICATION_REQUIRED"
    project_root_id: "UNKNOWN"
    project_root_url: "UNKNOWN"
    display_path: "UNKNOWN"
    designated_progress_file: "UNKNOWN"
    designated_progress_file_id: "UNKNOWN"
    designated_progress_file_url: "UNKNOWN"
    verification_status: "VERIFICATION_REQUIRED"
    last_verified_at: "2026-08-23T17:26:38+07:00"

  local_workspaces:
    - environment_scope: "WINDOWS_LOCAL_GPT_MCP"
      binding_state: "BOUND"
      canonical_path: "C:\\Users\\ADMINS\\lnwjud"
      repository: "captainhuke-dev/lnwjud"
      repository_url: "https://github.com/captainhuke-dev/lnwjud.git"
      verification_status: "VERIFIED"
      last_verified_at: "2026-08-23T17:26:38+07:00"

  # Generic non-Google-Drive File Storage is intentionally absent at bootstrap.
  # Project Settings Storage Path is unset; absence does not authorize fallback.
```

Generic `file_storage_locations` เนเธเนเน€เธเธเธฒเธฐ non-Google-Drive external storage scopes; Google Drive เธขเธฑเธเธเธ canonical เนเธ dedicated `google_drive` block เนเธฅเธฐเธซเนเธฒเธก duplicate target/content scope เน€เธ”เธตเธขเธงเธเธฑเธ. `BOUND` เธ•เนเธญเธเธกเธต provider-appropriate durable identity เนเธฅเธฐ pair เน€เธเธเธฒเธฐ `VERIFIED` เธซเธฃเธทเธญ `USER_CONFIRMED`; known-applicable unresolved = `VERIFICATION_REQUIRED`. Project เธ—เธตเนเนเธกเนเธกเธต external storage omit list เธเธตเนเนเธ”เน; absence/unresolved เธซเนเธฒเธก fallback เนเธ recent/search-ranked/mounted target. Multiple stores เนเธเนเนเธ”เนเน€เธกเธทเนเธญ content scopes distinct เนเธฅเธฐเธซเธเธถเนเธ governed content scope เธกเธต authoritative owner เน€เธ”เธตเธขเธง เธ“ เน€เธงเธฅเธฒเน€เธ”เธตเธขเธง. Actual credentials เธซเนเธฒเธกเน€เธเนเธเธ—เธตเนเธเธตเน; เนเธเน `SECRET-*` reference. Mount/sync/cache path เน€เธเนเธ routing evidence เนเธกเนเนเธเน Local Workspace, Canonical Implementation Source เธซเธฃเธทเธญ Runtime/Persistent-State authority เนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด.

Binding state เธเธญเธ GitHub, Google Drive เนเธฅเธฐเนเธ•เนเธฅเธฐ environment-scoped Local Workspace Binding เธ•เนเธญเธ resolve เนเธขเธเธเธฑเธเน€เธเนเธ exactly `BOUND | NOT_APPLICABLE | VERIFICATION_REQUIRED`:

- `BOUND` เธ•เนเธญเธเธกเธต durable routing identity เธญเธขเนเธฒเธเธเนเธญเธข GitHub owner/repository เธซเธฃเธทเธญ canonical repository URL; Drive project-root folder ID เธซเธฃเธทเธญ canonical folder URL; Local Workspace เธ•เนเธญเธเธกเธต verified/user-confirmed absolute path เธเธญเธ environment เธเธฑเนเธ เนเธฅเธฐ Git-backed workspace เธเธงเธฃ cross-check repository identity เน€เธกเธทเนเธญ practical.
- `VERIFICATION_REQUIRED` เน€เธเนเธ **fail-closed เธชเธณเธซเธฃเธฑเธ Material mutation**; read/search/discovery เน€เธเธทเนเธญ resolve candidate เธ—เธณเนเธ”เน เนเธ•เนเธซเนเธฒเธก Material write เนเธ unresolved target เนเธ”เธข default.
- `NOT_APPLICABLE` block Material Project work เธเนเธฒเธ connector เธเธฑเนเธเธเธเธเธงเนเธฒเธเธฐเธกเธต approved Root Governance binding/scope change.
- User Explicit Instruction เธ—เธตเนเธฃเธฐเธเธธ exact target เธญเธฒเธ authorize action เน€เธ”เธตเธขเธงเน€เธกเธทเนเธญ otherwise allowed เนเธ•เนเนเธกเน persistently rewrite binding.
- เธเธฒเธฃเน€เธเธฅเธตเนเธขเธ active binding เน€เธเนเธ Root Governance mutation: เธ•เนเธญเธ User Explicit Approval เนเธฅเธฐเนเธเน `FRAMEWORK-001` revision โ’ validate โ’ promote โ’ supersede/archive flow. Connector discovery, recency เธซเธฃเธทเธญ ranking เนเธกเน transfer authority.
- Repository Location Binding `โ ` File Storage Binding `โ ` Local Workspace Binding `โ ` current work branch/worktree `โ ` Canonical Integration Target `โ ` Canonical Implementation Source `โ ` Runtime Location / Runtime Data / Persistent-State authority. Project Location Binding เธซเนเธฒเธกเธชเธฃเนเธฒเธ `canonical_branch` เธซเธฃเธทเธญ branch authority เธเธนเนเธเธเธฒเธ; Git integration target เธขเธฑเธ governed เนเธ”เธข Framework `1.2.2` Base Freshness contract.

GREENFIELD เธ—เธตเนเธขเธฑเธเนเธกเนเธกเธต active `FRAMEWORK-001` เธญเนเธฒเธ Project-specific Bootstrap Location Block เน€เธกเธทเนเธญเธกเธต โ’ เนเธเน read-only discovery เน€เธกเธทเนเธญเธเธณเน€เธเนเธ โ’ Preview proposed GitHub/Drive/local-workspace/generic-file-storage binding states/identities เธ•เธฒเธก applicability โ’ explicit user approval โ’ first Material Project-Source write creates active `00` with approved binding. Binding uncertainty เธซเนเธฒเธกเธ–เธนเธเน€เธ”เธฒเธเธฒเธ chat memory, recent activity เธซเธฃเธทเธญ search result. MCP `workspaceId`, editor handle, active/recent workspace เน€เธเนเธ routing evidence เน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเนเธเน canonical Project identity; missing applicable local environment = `VERIFICATION_REQUIRED` เนเธ”เธข default. Persistent Local Workspace Binding change เธขเธฑเธเน€เธเนเธ Root Governance mutation เนเธฅเธฐ one-off exact local target เนเธกเน persistently rewrite binding.
## 3. Project Source Location and Semantic Namespace

Project Source เธญเธขเธนเนเธ—เธตเน:

```text
<Project-Root>/Project-Source/
```

Core documents:

```text
00 Project Source Framework     MANDATORY / NON-REMOVABLE ROOT
01 Project Source Index         MANDATORY
02 Project Overview             MANDATORY
03 Current State                MANDATORY
04 Decision Log                 MANDATORY
05 Requirements                 MANDATORY
06 Architecture                 CONDITIONAL
07 Implementation Plan          CONDITIONAL
08 Open Issues                  CONDITIONAL
09 Handoff                      MANDATORY
10 Change Log                   MANDATORY
11 Actor Registry               MANDATORY
12 Authorization Registry       MANDATORY
13 Evidence Registry            MANDATORY
14 Project Source Manifest      MANDATORY
15 Action Registry              MANDATORY
16 Migration Registry           MANDATORY
17 Secret Reference Registry    MANDATORY
18โ€“19                           RESERVED
```

Framework `1.2.0` standardizes extended documents:

```text
40 Technical Design               CONDITIONAL
60 Deployment Plan                CONDITIONAL
90 General / Special Governance Extension anchor
91 Project Management Control     CONDITIONAL / STANDARD IN 1.2.0+
92โ€“99 Project-specific / Governance Extension
```

Conditional documents เธชเธฃเนเธฒเธเน€เธเธเธฒเธฐเน€เธกเธทเนเธญ applicable; เธซเนเธฒเธกเธชเธฃเนเธฒเธเนเธเธฅเนเธงเนเธฒเธเน€เธเธทเนเธญเนเธซเนเธ”เธนเธเธฃเธ. `18โ€“19` เธซเนเธฒเธก materialize เน€เธเนเธ default/active starter.

Framework distribution artifacts `FRAMEWORK-RELEASE.yaml`, ChatGPT Project Instructions, เนเธฅเธฐ Claude Project Instructions เธญเธขเธนเนเธเธญเธ Project Source semantic namespace. NEW Project bootstrap เธเธฒเธ canonical repository `main`; initialized Project เนเธเน local pinned Project Source เน€เธเนเธ authority. Git tag/SHA/branch protection เน€เธเนเธ optional assurance เนเธกเนเนเธเน prerequisite เธเธญเธ normal bootstrap.

## 4. Naming and Revision

Project Source artifacts เนเธเน suffix:

```text
-YYMMDD-HHMM
```

Document revisions เนเธเน monotonic `r001`, `r002`, ... เนเธฅเธฐเธซเนเธฒเธก reuse. Canonical implementation filenames เธ—เธตเน ecosystem เธเธฑเธเธเธฑเธเธเธทเนเธญเธเธเธเธทเนเธญ canonical.

## 5. Bootstrap and Routing

เธ—เธธเธ session/task เธญเนเธฒเธเธเธฑเนเธเธ•เนเธณ:

```text
00 โ’ 01 โ’ 03
```

เธเธฒเธเธเธฑเนเธ `01` route เนเธเน€เธญเธเธชเธฒเธฃเธ—เธตเนเน€เธเธตเนเธขเธงเธเนเธญเธ.

GREENFIELD bootstrap:

```text
canonical main
โ’ README
โ’ FRAMEWORK-RELEASE.yaml
โ’ SKILL
โ’ latest amendment
โ’ Core Governance
โ’ 00 template
โ’ core skeletons
โ’ mockup
โ’ Preview
โ’ explicit user approval
โ’ create active 00 first
โ’ mandatory 01โ€“05 + 09โ€“17
โ’ evaluate conditional 06โ€“08 / 40 / 60 / 91
โ’ pin Framework/Schema locally
```

เธซเธฒเธ canonical Framework source เน€เธเนเธฒเธ–เธถเธเนเธกเนเนเธ”เน เนเธซเนเธซเธขเธธเธ” affected governance mutation เนเธฅเธฐเธฃเธฒเธขเธเธฒเธ limitation; เธซเนเธฒเธก reconstruct เธเธฒเธ memory. เธเธฒเธฃเนเธกเนเธกเธต immutable tag, exact SHA เธซเธฃเธทเธญ branch protection เนเธกเนเนเธเนเน€เธซเธ•เธธเนเธซเน block bootstrap เธ–เนเธฒ canonical source เธขเธฑเธเน€เธเนเธฒเธ–เธถเธเนเธ”เน.

### 5.1 Framework Source Provenance โ€” Optional Assurance

Exact Git provenance เน€เธเนเธ enhanced assurance เนเธกเนเนเธเน prerequisite เธเธญเธ normal Framework use. เธซเธฒเธ track เนเธซเนเธเธฑเธเธ—เธถเธเน€เธเธเธฒเธฐ observed values:

```yaml
framework_source_provenance:
  repository: "captainhuke-dev/ProjectFramework"
  source_ref: "main"
  release_tag: "NONE_OBSERVED"
  resolved_commit_sha: "b5a61e1dd34f3b0676dc9c0f5a2874413630d1db"
  framework_version: "1.3.0"
  schema_version: "1.0.0"
  captured_at: "2026-08-23T17:26:38+07:00"
  provenance_status: "VERIFIED"
```

เธซเนเธฒเธก predict/fabricate/backfill exact tag/SHA. เธซเธฒเธ exact provenance เนเธกเนเธกเธต เนเธซเนเนเธเน `UNKNOWN / UNVERIFIED` เน€เธกเธทเนเธญเธเธณเน€เธเนเธเธ•เนเธญเธ represent state. Absence เธเธญเธ optional exact provenance เน€เธเธตเธขเธเธญเธขเนเธฒเธเน€เธ”เธตเธขเธงเนเธกเนเธ—เธณเนเธซเน Project `NOT_OPERATIONALLY_READY`.

### 5.2 Concept-First Technical / Tooling Boundary

ProjectFramework เน€เธเนเธ **conceptual governance/planning framework first**. Tech Stack, installation, Docker, integrity เธซเธฃเธทเธญ automation concepts เธญเธเธดเธเธฒเธข roles/contracts/interfaces/verification เนเธ”เน เนเธ•เนเนเธกเนเธ–เธทเธญเน€เธเนเธ implicit authorization เนเธซเนเธชเธฃเนเธฒเธ implementation artifacts.

เธซเนเธฒเธกเธชเธฃเนเธฒเธเนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด:

```text
application source code
Dockerfile
Compose / Kubernetes / Helm runtime files
install scripts
validator / CLI
GitHub Actions / CI/CD
migration engine
scheduler / reminder runtime
background automation
dashboard / runtime enforcement
```

A real Project เธญเธฒเธเธกเธต artifacts เน€เธซเธฅเนเธฒเธเธตเนเธญเธขเธนเนเนเธฅเนเธง เนเธฅเธฐ Project Source เธชเธฒเธกเธฒเธฃเธ– document/reference/govern/verify เนเธ”เน. เธเธฒเธฃเธชเธฃเนเธฒเธเธซเธฃเธทเธญเนเธเน implementation เธเธฃเธดเธเธ•เนเธญเธเน€เธเนเธ separate explicit scope.

### 5.3 Registered Project Commands

Framework `1.3.0` registers bracketed Project inspection commands. Literal `[` and `]` are required; matching inside brackets is case-insensitive. Initial registry:

```text
[Project Status] : fresh read-only Project/Task/Git/verification/blocker dashboard
[Project Path]   : show/verify configured Project path values and route explicit change requests through existing location governance
```

Natural-language command-help requests list only registered commands as `[XXX] : purpose`; do not invent commands. `[Project Status]` fresh-observes Identity โ’ Health โ’ Remain Tasks โ’ Git Sync โ’ Working Tree โ’ Verification โ’ Blockers, reuses `GREEN | AMBER | RED | UNKNOWN`, and keeps Task count distinct from Git change count. `[Project Path]` treats angle-bracket values such as `<STORAGE>` / `<WS>` as unset, never literal paths or fallback authority. Persistent path/binding changes retain existing explicit approval + Root Governance revision flow.

Markdown response-close presentation SHOULD keep canonical labels visibly renderable, e.g. `**[Chat]:** CONTINUE_CURRENT_CHAT`; wrapping is presentation-only and does not rename `[Chat]:` or lifecycle tokens.

## 6. Truth and Uncertainty

Truth Domains:

```text
GOVERNANCE INTENT REQUIREMENTS IMPLEMENTATION RUNTIME DATA IDENTITY AUTHORITY HISTORY EXTERNAL
```

Epistemic Status:

```text
VERIFIED USER_CONFIRMED INFERRED ASSUMED UNKNOWN CONFLICTED STALE
```

Freshness:

```text
IMMUTABLE STABLE CHANGEABLE VOLATILE
```

เธซเนเธฒเธกเธขเธเธฃเธฐเธ”เธฑเธ `ASSUMED/INFERRED` เน€เธเนเธ `VERIFIED` เนเธ”เธขเนเธกเนเธกเธต evidence; `VOLATILE` เธ•เนเธญเธ fresh-check เน€เธกเธทเนเธญเธกเธตเธเธฅเธ•เนเธญ decision/mutation. Truth mismatch เนเธเน `DRIFT-*`; competing semantic state เนเธเน `CONFLICT-*` เนเธฅเธฐเธซเนเธฒเธก last-write-wins.

### 6.1 Canonical Implementation Source and Runtime Authority

เน€เธกเธทเนเธญ implementation เธกเธตเธญเธขเธนเนเนเธฅเธฐ distinction เธเธตเน material เธ•เนเธญ development/recovery/verification/deployment Project MUST เธฃเธฐเธเธธ **Canonical Implementation Source** เธชเธณเธซเธฃเธฑเธ affected scope เนเธ”เน. Canonical Implementation Source เธเธทเธญ durable declared source location เธ—เธตเน verified state เน€เธเนเธ authoritative `IMPLEMENTATION` Truth; เธชเธณเธซเธฃเธฑเธ Git-backed Project เนเธ”เธขเธเธเธ•เธดเธเธทเธญ verified Git/source tree เธ•เธฒเธก repository/workspace contract.

`durable` เธซเธกเธฒเธขเธ–เธถเธ source เธ•เนเธญเธ survive lifecycle เธ—เธตเน Project เธญเนเธฒเธเธงเนเธฒเธชเธฒเธกเธฒเธฃเธ– replace/recreate runtime เนเธ”เน เนเธ”เธขเนเธกเนเธเธถเนเธ runtime instance เธ—เธตเน disposable/recreatable เน€เธเนเธ sole copy. เนเธกเนเนเธ”เนเธเธฑเธเธเธฑเธเธงเนเธฒ source เธ•เนเธญเธเธญเธขเธนเน physical host filesystem. Valid topology เธญเธฒเธเน€เธเนเธ host Git repo, Git worktree, remote/VM durable workspace เธซเธฃเธทเธญ Dev Container เธ—เธตเนเนเธเน durable bind mount/workspace volume.

```text
Implementation Truth โ’ Canonical Implementation Source
Runtime Truth        โ’ fresh runtime observation
```

Runtime execution/editing เนเธกเน transfer Implementation authority เนเธ”เธขเธเธฃเธดเธขเธฒเธข. Runtime-only hotfix/interactive edit เนเธกเนเนเธเน canonical implementation completion เธเธ accepted intent เธ–เธนเธเธเธณเธเธฅเธฑเธเธเนเธฒเธ governed change path เน€เธเนเธฒ Canonical Implementation Source เนเธฅเธฐ reverify เธชเธณเน€เธฃเนเธ. เธซเธฒเธ Implementation เธเธฑเธ Runtime เธเธงเธฃ align เนเธ•เนเธ•เนเธฒเธเธเธฑเธ materially เนเธซเนเนเธเน `DRIFT-*`; เธซเนเธฒเธกเธชเธฃเนเธฒเธ parallel workspace/runtime drift family.

Runtime component เธ—เธตเนเธเธฃเธฐเธเธฒเธจ disposable/recreatable เธซเนเธฒเธกเธเธฅเธฒเธขเน€เธเนเธ sole authoritative implementation copy เนเธ”เธขเธญเธธเธเธฑเธ•เธดเน€เธซเธ•เธธ. State เธ—เธตเน `REQ-*`, `DEC-*`, `40` เธซเธฃเธทเธญ deployment contract เธเธณเธซเธเธ”เธงเนเธฒเธ•เนเธญเธ survive expected replacement เธ•เนเธญเธเธกเธต declared persistent-state authority/mechanism. Rebuildable cache/temp/scratch state เธชเธฒเธกเธฒเธฃเธ– ephemeral เนเธ”เนเน€เธกเธทเนเธญเนเธกเนเธกเธต survival requirement.

Docker, host-local source, immutable image เนเธฅเธฐ production source mount เนเธกเนเนเธเน universal requirement/prohibition; topology เน€เธเนเธ Project-specific/applicability-driven เนเธฅเธฐเธ•เนเธญเธ preserve Truth/authority/persistence contract เธเธตเน.

## 7. Canonical Object Homes

```text
DEC-*       โ’ 04
REQ-*       โ’ 05
ISS-*       โ’ 08
DRIFT-*     โ’ 08
CONFLICT-*  โ’ 08
CHG-*       โ’ 10
ACTOR-*     โ’ 11
INST-*      โ’ 11
AUTH-*      โ’ 12
DEL-*       โ’ 12
EVD-*       โ’ 13
ACT-*       โ’ 15
MIG-*       โ’ 16
SECRET-*    โ’ 17
RISK-*      โ’ 91
ASM-*       โ’ 91
MS-*        โ’ 91
OUT-*       โ’ 91
DEP-*       โ’ 91
CR-*        โ’ 91
GATE-*      โ’ 91
```

เธซเธเธถเนเธ object type เธกเธต authoritative home เน€เธ”เธตเธขเธง. เน€เธญเธเธชเธฒเธฃเธญเธทเนเธ reference Stable ID เน€เธ—เนเธฒเธเธฑเนเธ.

### 7.1 Materialized Current State and Stable-ID Resolution

Active canonical registries เน€เธเนเธ **materialized current projections, not delta chains**. เธ—เธธเธ referenced current Stable ID เธ•เนเธญเธ resolve เธ เธฒเธขเนเธ Current Reconstructable Snapshot เนเธ”เธขเนเธกเนเน€เธเธดเธ” archive. Record เธ•เนเธญเธเธกเธต current semantic payload เธซเธฃเธทเธญ link เนเธ active/current canonical Detail Document เธ—เธตเนเน€เธเนเธ payload เธเธฑเนเธ. Archive เน€เธเนเธ Historical Truth/rationale/evolution เน€เธ—เนเธฒเธเธฑเนเธ.

Delta-only shorthand เน€เธเนเธ `retain previous status`, `unchanged from rNNN`, `see archived revision` เนเธเนเนเธ—เธ current authoritative payload เนเธกเนเนเธ”เนเน€เธกเธทเนเธญ semantics เธเธฃเธดเธเธญเธขเธนเนเน€เธเธเธฒเธฐ archive.

เธเธเธเธตเนเนเธเนเธเธฑเธ `DEC-*`, `REQ-*`, เนเธฅเธฐ `RISK/ASM/MS/OUT/DEP/CR/GATE` เนเธ `91` เน€เธ—เนเธฒเธเธฑเธ. Failure = integrity/readiness defect เธเธญเธ affected scope.

## 8. Project Management Control โ€” `91`

`91 Project Management Control` เน€เธเนเธ STANDARD CONDITIONAL เนเธ Framework `1.2.0+`. เธชเธฃเนเธฒเธเน€เธกเธทเนเธญเธกเธต management-control object เธ—เธตเน materially applicable เธญเธขเนเธฒเธเธเนเธญเธขเธซเธเธถเนเธเธฃเธฒเธขเธเธฒเธฃ.

### 8.1 Risk

`RISK-*` = uncertain future event/condition. `ISS-*` = problem เธ—เธตเน materialized/current เนเธฅเนเธง.

```text
IDENTIFIED OPEN MITIGATING MONITORING ACCEPTED MATERIALIZED CLOSED SUPERSEDED
```

Risk materialization เธ•เนเธญเธ preserve `RISK-*` เนเธฅเธฐ link `ISS-*`; เธซเนเธฒเธก delete/rewrite Risk เน€เธเนเธ Issue. `ACCEPTED` exposure เธ•เนเธญเธเธกเธต relevant decision/authority + review trigger เน€เธกเธทเนเธญ material.

Minimum semantics: Risk Statement, Probability, Impact, Trigger/Early Warning, Mitigation, Contingency, Owner, Review Trigger/Review By, Status, related IDs/evidence, Materialized Issue when applicable.

### 8.2 Assumption

`ASM-*` = proposition เธ—เธตเนเธขเธฑเธเธเธถเนเธเธเธฒเธญเธขเธนเนเนเธ•เน evidence เธขเธฑเธเนเธกเนเธเธญเน€เธเนเธ established truth.

```text
UNVERIFIED โ’ VALIDATED / INVALIDATED / SUPERSEDED
```

INVALIDATED เธ•เนเธญเธ impact-assess เนเธฅเธฐเธญเธฒเธ trigger `DRIFT-*`, `CR-*`, replanning, Decision revalidation, Requirement revision, Risk/Issue update.

### 8.3 Action vs Milestone vs Outcome

```text
ACT-* = work/action
MS-*  = significant checkpoint/state
OUT-* = intended result/benefit/effect

ACT DONE โ  MS REACHED โ  OUT ACHIEVED
```

### 8.4 Dependency

`DEP-*` เธฃเธญเธเธฃเธฑเธ `PERSON / TEAM / APPROVAL / DECISION / VENDOR / SYSTEM / API / DATA / CONTRACT / PROJECT / INFRASTRUCTURE / OTHER`.

`AVAILABLE` = source/resource obtainable; `SATISFIED` = governed dependency requirement fulfilled.

### 8.5 Change Request vs Change Log

```text
CR-*  = proposed/material change + impact assessment + decision path
CHG-* = historical record of applied/observed change
```

CR impact assessment เธเธดเธเธฒเธฃเธ“เธฒ Scope, REQ, DEC, Architecture, Tech Stack, Source Structure, Configuration, Deployment Modes, Data/Migration, Security/Authority, MS/OUT, RISK, DEP, effort/schedule, operations/handoff เน€เธกเธทเนเธญ applicable. CR approval เนเธกเน grant unrelated implementation authority.

### 8.6 Review Gate

`GATE-*` = governed checkpoint.

```text
PLANNED โ’ READY_FOR_REVIEW โ’ PASSED / FAILED / WAIVED
```

Minimum semantics: Purpose, Affected Scope, Entry/Pass Criteria, Required Evidence, related IDs, Review Owner, Required Authority, Status, Findings, Exceptions/Waiver, Next Action, Reviewed At. `WAIVED` เธ•เนเธญเธเธกเธต rationale + authority/decision reference.

## 9. Project Health and Review Cadence

Project Health เธญเธขเธนเนเนเธ `03 Current State` เน€เธเนเธ **derived assessment**, เนเธกเนเนเธเน replacement เธเธญเธ canonical objects.

Dimensions:

```text
Scope
Progress / Schedule
Risk
Quality / Validation
Dependencies
Authority
Knowledge
Readiness
Technical / Deployment when applicable
```

States:

```text
GREEN AMBER RED UNKNOWN
```

Optional dimension เธ—เธตเน not applicable เนเธซเน omit เนเธกเนเนเธเน mark GREEN. เนเธ•เนเธฅเธฐ dimension record/resolve:

```text
State
Reason
Supporting Stable IDs / Evidence
Owner
Last Reviewed
Next Review / Trigger when applicable
```

Framework เนเธกเน define opaque automatic aggregate score.

Review Cadence:

```text
TIME_BASED
EVENT_BASED
```

เนเธเนเธเธฑเธ Current State, Risk, Assumption, Milestone/Outcome, Decision Revalidation, Technical Design, Deployment Readiness, Handoff Refresh เนเธ”เน. Framework เธเธณเธซเธเธ” semantics เน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเธชเธฃเนเธฒเธ scheduler/reminder runtime.

## 10. Decision Revalidation

`DEC-*` เธขเธฑเธ canonical เนเธ `04`. เน€เธเธดเนเธก current fields:

```text
Validity Basis
Review Trigger
Review By
Last Revalidated
Revalidation Status
Revalidation Evidence
```

Statuses:

```text
NOT_DUE REVIEW_DUE REVALIDATED SUPERSEDED
```

Triggers เธญเธฒเธเน€เธเนเธ invalidated `ASM-*`, materially changed `DEP-*`, Requirement/Tech Stack/deployment-mode change, material approved `CR-*`, external regulation/vendor change, review date, เธซเธฃเธทเธญ runtime evidence contradicting Decision basis.

## 11. Responsibility and Authority

`11 Actor Registry` เธชเธฒเธกเธฒเธฃเธ–เน€เธเนเธ scope-keyed Responsibility Mapping:

```text
Responsible
Accountable
Consulted
Informed
```

**Responsibility โ  Authority.** Role/RACI เนเธกเน grant permission เธชเธณเธซเธฃเธฑเธ R2/R3 mutation, approval, deployment, production access เธซเธฃเธทเธญ external action. Actual authority เธญเธขเธนเนเนเธ `12` เธเนเธฒเธ `AUTH-* / DEL-*`.

Authority เธซเนเธฒเธก transfer เธเนเธฒเธ Handoff, prompt, memory, role, responsibility mapping, branch เธซเธฃเธทเธญ agent instruction.

## 12. Risk and Approval

```text
R0 READ_ONLY
R1 REVERSIBLE_LOCAL
R2 SHARED_STATE
R3 EXTERNAL_OR_IRREVERSIBLE
```

Default:

- R0 โ’ no approval
- R1 โ’ allowed inside approved scope
- R2 โ’ explicit approval เธซเธฃเธทเธญ valid Standing Authorization
- R3 โ’ explicit approval for that action by default

Project-Specific Rules เธ—เธณเนเธซเน stricter เนเธ”เน. Before R2/R3 mutation, fresh-read authority.

## 13. Preflight and Postflight

READ PREFLIGHT: identity, `00`, `01`, `03`, scope, truth, freshness, blockers.

MUTATION PREFLIGHT เน€เธเธดเนเธก actor/instance, authority, target, allowed/forbidden effects, risk, approval, relevant REQ/DEC, management controls when relevant, base/hash, reversibility, evidence.

Postflight เธ•เนเธญเธ verify resulting state เธ•เธฒเธก risk; execution success เธญเธขเนเธฒเธเน€เธ”เธตเธขเธงเนเธกเน prove completion.

## 14. Draft, Promotion, Archive

```text
Scratch            โ’ outside Project-Source/
Formal candidate   โ’ drafts/
Active truth       โ’ Project-Source root
Historical         โ’ archive/
```

Promotion:

```text
candidate โ’ validate โ’ base/hash check โ’ promote โ’ supersede old โ’ archive old โ’ sync Index/Change Log/Manifest โ’ postflight
```

Archive เน€เธเนเธ Historical Truth; current resolution เธซเนเธฒเธกเธเธถเนเธ archive. เธซเนเธฒเธก Active revision เธเนเธณ semantic identity เน€เธ”เธตเธขเธงเธเธฑเธ.

## 15. Index and Manifest

`01` = Front Door + derived Active registry + human/agent routing.

เน€เธกเธทเนเธญ active:

```text
40 โ’ Tech Stack / technical / source / config / runtime blueprint
60 โ’ installation / deployment / operations
91 โ’ RISK / ASM / MS / OUT / DEP / CR / GATE
```

`14` = Current Reconstructable Snapshot inventory. เธ–เนเธฒ `40`, `60`, `91` active/current เนเธฅเธฐเธเธณเน€เธเนเธเธ•เนเธญ current truth เธ•เนเธญเธเธฃเธงเธกเนเธ Manifest/CURRENT export.

เธ–เนเธฒ Framework Source Provenance เธ–เธนเธ track, `14` preserve observed state เน€เธ”เธตเธขเธงเธเธฑเธ active `00`; เธซเนเธฒเธก invent missing provenance. Manifest mismatch เธ•เนเธญเธ root-cause เธเนเธญเธ regenerate.

## 16. Evidence, Knowledge Debt, and Secrets

Important evidence เนเธเน `EVD-*`; raw artifacts เธญเธขเธนเน `evidence/<category>/`.

Material stale/missing knowledge เนเธเน:

```text
ISS-* in 08
issue_type: KNOWLEDGE_DEBT
```

เธ–เนเธฒเนเธกเนเธกเธต active `08`, material Knowledge Debt เธ—เธณเนเธซเน `08` applicable. Runtime success เนเธกเนเนเธ”เนเธฅเธ Knowledge Debt เนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด; Health/Readiness เธญเธฒเธ downgrade เน€เธกเธทเนเธญ material.

**เธซเนเธฒเธกเน€เธเนเธ actual secret** เนเธ Project Source / Evidence / Manifest / Export. `SECRET-*` เน€เธเนเธ external-reference metadata เน€เธ—เนเธฒเธเธฑเนเธ:

```yaml
secret_value_present: false
```

## 17. Handoff

`09-Handoff` = Current Continuation Contract.

```text
DRAFT โ’ OFFERED โ’ ACKNOWLEDGED โ’ ACCEPTED โ’ SUPERSEDED
```

Handoff เธ•เนเธญเธเธกเธต current/pending work, active objects, required read order, freshness warnings, authority refs, `authority_transfer: false`, exact next action.

เน€เธกเธทเนเธญ applicable เนเธซเน surface active/high `RISK-*`, invalid/unverified `ASM-*`, blocking `DEP-*`, next/recent `MS-*`, Outcomes awaiting measurement, open/approved `CR-*`, upcoming/failed `GATE-*`, Technical/Deployment warnings, Source/Docker variance, Knowledge Debt.

### 17.1 Externalized Working Memory and Chat Lifecycle

Project-local binding contract:

```text
Material connector work โ’ persist at logical checkpoint to source-native durable state.
Transient connector reads/searches โ’ no persistence requirement by default.
GitHub โ’ repository/canonical Project Source owner.
Drive โ’ existing designated progress .md, else one stable PROJECT-PROGRESS.md when needed.
Persistence failure โ’ PERSISTENCE_PENDING; no safe START_NEW_CHAT recommendation.
Chat lifecycle โ’ CONTINUE_CURRENT_CHAT | START_NEW_CHAT.
New chat โ’ bootstrap from persisted current state, not old transcript.
```

`Material Project Work` เธเธทเธญ connector-derived result/change เธ—เธตเนเธ•เนเธญเธเนเธเนเธ•เนเธญเน€เธเธทเนเธญ reliable continuation, governance, decision-making เธซเธฃเธทเธญ execution; `Transient MCP Activity` เธเธทเธญ intermediate read/search/comparison เธ—เธตเนเนเธกเนเธ•เนเธญเธเนเธเนเธ•เนเธญ. Persist Material work เธเธฃเธฑเนเธเน€เธ”เธตเธขเธงเธ•เนเธญ `Logical Checkpoint`, เนเธกเนเนเธเนเธ—เธธเธ tool call. `PROJECT-PROGRESS.md` เน€เธเนเธ continuation cache เน€เธกเธทเนเธญเนเธกเนเธกเธต designated progress Markdown เน€เธ”เธดเธกเนเธฅเธฐ durable continuation state เธเธณเน€เธเนเธ; เนเธกเนเนเธเน source of truth เนเธซเธกเน. Existing initialized Projects เนเธเน local pinned Framework เธ•เนเธญเนเธเนเธฅเธฐเนเธกเน auto-upgrade เธเธฒเธ upstream.

## 18. Technical Design โ€” `40`

`06 Architecture` = major architecture view. `40 Technical Design` = deeper implementation-facing blueprint; deepen/reference `06`, เธซเนเธฒเธก fork authoritative payload เธเนเธณ.

Tech Stack entry เน€เธกเธทเนเธญ material:

```text
Technology
Role / Responsibility
Version or Supported Range
Required / Optional
Why Used / Decision Reference
Used By Component(s)
Operational Dependency
Lifecycle / Support Constraint when material
Replacement Boundary when material
Epistemic / Verification State
```

`40` เธญเธฒเธเน€เธเนเธ Component Responsibility, Inputs/Outputs, Interfaces, Dependencies, Data/Storage interaction, Security/Authority Boundary, Runtime Boundary, Source Structure Blueprint, Development Workspace Contract, Configuration Contract, Runtime Requirements.

### 18.1 Development Workspace Contract

เน€เธกเธทเนเธญ material เนเธซเน `40` เธฃเธฐเธเธธ/resolve:

```text
Canonical Implementation Source
Repository / Source Identity when applicable
Development Workspace Type
Workspace Location / Boundary
Workspace Durability
Human / Agent Edit Location
Execution Environment
Source-to-Runtime Mapping
Dependency Isolation Strategy
Runtime Mutability Boundary
Persistent-State Boundary
Related REQ / DEC / RISK / ASM / DEP / CR / EVD
Verification / Drift Notes
```

Workspace/mapping labels เน€เธเนเธ `LOCAL_WORKSPACE`, `GIT_WORKTREE`, `REMOTE_DURABLE_WORKSPACE`, `DEV_CONTAINER_DURABLE_WORKSPACE`, `DIRECT_EXECUTION`, `BIND_MOUNT`, `WORKSPACE_VOLUME`, `IMAGE_OR_ARTIFACT_BUILD`, `REMOTE_SYNC` เน€เธเนเธ descriptive blueprint vocabulary เนเธกเนเนเธเน lifecycle state เธซเธฃเธทเธญ Stable-ID family เนเธซเธกเน.

Project เธญเธฒเธเนเธเน mapping เธ•เนเธฒเธเธเธฑเธเธฃเธฐเธซเธงเนเธฒเธ Development/Test/Staging/Production เนเธ”เน เนเธ•เนเธ•เนเธญเธ explicit เน€เธกเธทเนเธญ material เนเธฅเธฐเนเธกเนเธเธฑเธ” REQ/DEC/Technical/Deployment contracts.

Configuration Contract เนเธขเธ semantic meaning เธญเธญเธเธเธฒเธ packaging mode:

```text
Application Settings
Environment-specific Settings
External Service Endpoints
Persistence Settings
Feature / Capability Settings when material
Secret References
```

## 19. Deployment Plan โ€” `60`

Deployment support state:

```text
SOURCE_ONLY
DOCKER_ONLY
SOURCE_AND_DOCKER
NOT_APPLICABLE
```

### 19.1 Source/Docker Parity

`SOURCE_AND_DOCKER` เธ•เนเธญเธ share one declared contract for:

```text
core application semantics
configuration meaning
required external dependencies
data compatibility
security assumptions
supported capability set
persistence semantics
upgrade compatibility
```

Intentional difference เนเธเน Deployment Mode Variance: Affected Capability, Source Behavior, Docker Behavior, Reason, Impact, Related IDs, Owner, Acceptance/Resolution State. Unexpected mismatch โ’ `DRIFT-*`.

### 19.2 Installation / Operations Contract

`60` เธ•เธญเธเธงเนเธฒ resulting system เธ•เธดเธ”เธ•เธฑเนเธ/configure/start/stop/verify/diagnose/upgrade/rollback/backup/restore/cleanup/troubleshoot เธญเธขเนเธฒเธเนเธฃเนเธ supported modes.

เน€เธกเธทเนเธญ applicable เธ•เนเธญเธ cover:

```text
Prerequisites
Supported OS / Platform / Architecture
Deployment Source / Artifact Acquisition
Required Runtime / Container Runtime
External Services
Required Permissions
Configuration Inputs
Secret Requirements / SECRET-* references
Source-to-Runtime Mapping
Runtime Mutability Expectation
Persistent-State Boundary
Data / Storage Authority
Replacement / Recreation Expectation
Development-only vs Production Mapping Differences
Data / Storage Initialization
Installation / Initialization Procedure
Start / Stop Procedure
Verification / Health Check
Logs / Diagnostics
Upgrade
Rollback
Backup / Restore
Uninstall / Cleanup
Troubleshooting
Known Limitations / Deployment Mode Variance
```

Install/start command success เนเธกเนเน€เธ—เนเธฒเธเธฑเธ operational readiness. Verification เธเธดเธเธฒเธฃเธ“เธฒ service availability, dependency reachability, storage initialization/persistence, configuration loaded, secrets resolved without exposure, health/runtime signal, core flow usability, running version identity, Source/Docker parity เนเธฅเธฐ required-survival state เธ•เธฒเธก declared recreation lifecycle เน€เธกเธทเนเธญ applicable.

## 20. Adoption Mode and Migration

```text
GREENFIELD BROWNFIELD IMPORT
```

- GREENFIELD โ’ canonical main bootstrap โ’ Preview โ’ approval โ’ create mandatory core โ’ evaluate conditional docs โ’ pin Framework/Schema
- BROWNFIELD โ’ preserve-first; เธซเนเธฒเธก move/rename/delete legacy source เธญเธฑเธ•เนเธเธกเธฑเธ•เธด
- IMPORT โ’ quarantine `import-staging/` เธเนเธญเธ promotion

Project pin Framework/Schema version. เธซเนเธฒเธก auto-upgrade. Framework `1.3.0` เนเธเน Direct-to-Latest / Cumulative Target-State Upgrade เธชเธณเธซเธฃเธฑเธ upgrade เธ—เธตเนเนเธ”เนเธฃเธฑเธเธญเธเธธเธกเธฑเธ•เธด: compare current reconstructable Project เนเธ”เธขเธ•เธฃเธเธเธฑเธ selected target, migrate เน€เธเธเธฒเธฐ cumulative semantic delta, preserve Stable IDs/current truth/Project-Specific Rules/bindings/history, เนเธฅเธฐเนเธกเนเธเธฑเธเธเธฑเธ execute intermediate release migrations. Classify exactly `FAST_PATH | ASSESSED_PATH | MAJOR_MIGRATION_REQUIRED`. Skipping intermediate execution เนเธกเน skip assessment, Preview/approval, rollback, validation, evidence เธซเธฃเธทเธญ promotion. Latest starter เนเธกเนเนเธเน default destructive rebuild path เธชเธณเธซเธฃเธฑเธ initialized Project. เนเธเน affected verification เธฃเธฐเธซเธงเนเธฒเธเธเธฒเธเนเธฅเธฐ `RELEASE_FULL` เธเธฃเธฑเนเธเน€เธ”เธตเธขเธงเธเธ final unchanged target candidate.

### 20.1 Brownfield Slot `91` Collision

Pre-1.2.0 Project เธญเธฒเธเนเธเน `91` เน€เธเนเธ custom extension เธญเธขเธนเนเนเธฅเนเธง. เธซเนเธฒเธก overwrite.

```text
detect occupied 91
โ’ MIG-* compatibility assessment
โ’ preserve identity/history/references
โ’ propose suitable free 92โ€“99 or other semantically correct slot
โ’ explicit approval
โ’ governed migration
โ’ then standard 91 activation if applicable
```

### 20.2 No Automatic Free-Text Promotion

Old prose mentioning risk/assumption/date/dependency/scope/outcome/gate เธซเนเธฒเธก auto-create Stable IDs. Promote เน€เธเนเธ `RISK/ASM/MS/OUT/DEP/CR/GATE` เนเธ”เนเน€เธกเธทเนเธญ current semantics, status, ownership เนเธฅเธฐ epistemic/evidence state เน€เธเธตเธขเธเธเธญเน€เธ—เนเธฒเธเธฑเนเธ. เธ–เนเธฒเนเธกเนเธเธญ เนเธซเน preserve uncertainty เนเธ—เธ fabricate identity.

Legacy `00-Project Source Rule` migration เธขเธฑเธเนเธเน preserve-first governed promotion เน€เธเนเธเน€เธ”เธดเธก.

### 20.3 Git Work Base Freshness and Forward-Port

เน€เธกเธทเนเธญ Project เนเธเน Git branch/worktree เน€เธเธทเนเธญเธชเธฃเนเธฒเธ work package เธ—เธตเนเธเธฐ integrate เธเธฅเธฑเธ canonical target เนเธซเนเนเธเน contract เธเธตเน:

```text
Independent Git work โ’ fresh Canonical Integration Target
Feature-on-feature dependency โ’ explicit STACKED_WORK
STALE_NON_SEMANTIC โ’ BASE_STALE โ’ update/rebase appropriately โ’ reverify โ’ FRESH
STALE_SEMANTIC โ’ BASE_STALE + FORWARD_PORT_REQUIRED
Before merge โ’ Base Freshness Gate against current target head
Git conflict-free / mergeable โ’ เนเธกเนเน€เธ—เนเธฒเธเธฑเธ semantic acceptance
```

Binding semantics:

1. **Independent Work** เธ•เนเธญเธเน€เธฃเธดเนเธกเธเธฒเธ current observed Canonical Integration Target; เธซเนเธฒเธกเธชเธฃเนเธฒเธเธเธฒเธ feature branch เธ—เธตเน checkout เธญเธขเธนเนเนเธ”เธข default. Local `main` เนเธกเนเนเธ”เน prove เธงเนเธฒ current เธเธเธเธงเนเธฒเธเธฐ fresh-check canonical target.
2. Feature-on-feature dependency เธญเธเธธเธเธฒเธ•เน€เธเธเธฒเธฐ explicit `STACKED_WORK` เธเธฃเนเธญเธก parent ref/commit, dependency reason, invalidation condition เนเธฅเธฐ expected integration order. Parent change เธ•เนเธญเธ re-evaluate child base เน€เธกเธทเนเธญ material.
3. Base Freshness vocabulary เธเธทเธญ `FRESH | STALE_NON_SEMANTIC | STALE_SEMANTIC | UNKNOWN`. `BASE_STALE` เน€เธเนเธ workflow condition เน€เธ—เนเธฒเธเธฑเนเธ เนเธกเนเนเธเน Project state, Epistemic Status เธซเธฃเธทเธญ Stable-ID family.
4. Commit count เนเธกเนเนเธเน semantic threshold. เนเธซเนเธ”เธนเธงเนเธฒ upstream เน€เธเธฅเธตเนเธขเธ Framework/Root Governance/Schema/authority/routing/REQ/DEC/interfaces/technical-deployment contracts เธซเธฃเธทเธญ assumption เธ—เธตเนเธเธฒเธเธเธถเนเธเธเธฒเธซเธฃเธทเธญเนเธกเน.
5. `STALE_NON_SEMANTIC`: เนเธซเน mark `BASE_STALE` เธเธเธเธงเนเธฒ base เธเธฐเธ–เธนเธ update เธ”เนเธงเธขเธงเธดเธเธตเธ—เธตเนเน€เธซเธกเธฒเธฐเธชเธกเนเธฅเธฐ affected verification เธเธฐเธเนเธฒเธ. Private/rewritable work เธญเธฒเธเนเธเน `REBASE_REQUIRED`; shared/public branch เนเธเน history-preserving merge/update strategy เนเธ”เน. เธซเธฅเธฑเธ update + verification เธชเธณเน€เธฃเนเธเธเธถเธเธเธฅเธฑเธ `FRESH`.
6. `STALE_SEMANTIC`: เธซเธขเธธเธ” affected new implementation scope, assess changed assumptions เนเธฅเธฐเนเธเน `FORWARD_PORT_REQUIRED` เนเธ”เธข default. Forward-Port เธ•เนเธญเธเธชเธฃเนเธฒเธ clean branch/worktree เธเธฒเธ current target เนเธฅเนเธง carry เน€เธเธเธฒเธฐ still-valid accepted changes; temporary staging/transport, obsolete workflow/version metadata, superseded assumptions เนเธฅเธฐ unrelated experiment เนเธกเนเธเธงเธฃเธ–เธนเธเธเธณเน€เธเนเธฒเน€เธเธตเธขเธเน€เธเธฃเธฒเธฐเธญเธขเธนเนเนเธ stale branch.
7. เธเนเธญเธ acceptance/merge เธ•เนเธญเธ fresh-resolve current target head เธญเธตเธเธเธฃเธฑเนเธ. Target movement เธซเธฅเธฑเธ review เธญเธฒเธเธ—เธณเนเธซเน review/gate เน€เธ”เธดเธก stale เนเธฅเธฐเธ•เนเธญเธ re-evaluate.
8. `git conflict = 0`, `mergeable = true` เธซเธฃเธทเธญ successful rebase เนเธกเน override semantic gate. **Mergeable โ  Acceptable.**
9. เน€เธกเธทเนเธญ base staleness materialize เน€เธเนเธ Project truth เนเธซเนเนเธเน `DRIFT-* / CONFLICT-* / MIG-* / CR-*` เน€เธ”เธดเธกเธ•เธฒเธก semantics; เธซเนเธฒเธกเธชเธฃเนเธฒเธ parallel ID family.
10. Existing Project เธขเธฑเธเธเธ pinned local `FRAMEWORK-001`; upstream movement เนเธกเน auto-upgrade. เธเธ•เธดเธเธฒเธเธตเนเนเธกเน authorize Git hooks, bots, Actions, validator, scheduler เธซเธฃเธทเธญ branch-protection automation.

## 21. Export

Profiles:

```text
CURRENT AUDIT FULL
```

`CURRENT` เธ•เนเธญเธ include current canonical records เนเธฅเธฐ active/current Detail Documents เธฃเธงเธก `40/60/91` เน€เธกเธทเนเธญเธเธณเน€เธเนเธเธ•เนเธญ current truth เนเธ”เธขเนเธกเนเธเธถเนเธ archive. Actual secrets เธซเนเธฒเธกเธญเธขเธนเนเนเธเธ—เธธเธ export profile.

## 22. Retention and Readiness

Preserve revisions, Decisions, Requirements, Change Log, management-control history, Identity lineage indefinitely by default. Purge เธ•เนเธญเธ authorized, เนเธกเนเธกเธต active refs, audit เนเธ”เน เนเธฅเธฐเนเธกเนเธ—เธณเธฅเธฒเธข reconstructability.

`OPERATIONALLY_READY` เธซเธกเธฒเธขเธ–เธถเธ Agent เนเธซเธกเนเธ•เธญเธเนเธ”เนเนเธ”เธขเนเธกเนเน€เธ”เธฒ:

1. What is true now?
2. What is allowed now?
3. What must happen next?

Optional Git/repository assurance เนเธกเนเน€เธเธฅเธตเนเธขเธ readiness เนเธ”เธขเธญเธฑเธ•เนเธเธกเธฑเธ•เธด เน€เธงเนเธเนเธ•เน Project-Specific Rule เธเธณเธซเธเธ”.

## 23. Initial Creation / Structural Migration Gate

เธเนเธญเธ first creation เธซเธฃเธทเธญ major structural migration เธ•เนเธญเธ Preview เธญเธขเนเธฒเธเธเนเธญเธข Adoption Mode, Identity, files/directories, conditional files, known Decisions/Assumptions, Unknowns, expected readiness/risk, migration impact. เธ•เนเธญเธ User Approval เธเนเธญเธ write.

## 24. Completion Reporting

เธซเธฅเธฑเธ Create / Migrate / Import / Major Update / Handoff / Export เธ•เนเธญเธเธฃเธฒเธขเธเธฒเธ Human + Machine summary.

```text
COMPLETE PARTIAL BLOCKED FAILED
```

เธ•เนเธญเธเนเธขเธ Execution, Verification, State Confirmation. เธซเนเธฒเธก claim DONE/DEPLOYED/MIGRATED/VALID เนเธ”เธขเนเธกเนเธกเธต risk-appropriate verification.

---

# Project-Specific Rules

> Child governance เธเธตเน inherit เธเธฒเธ `FRAMEWORK-001`. เนเธเนเน€เธเธดเนเธก Project-specific constraint เนเธ”เน เนเธ•เนเธซเนเธฒเธก weaken/contradict Root Framework.

## PSR-001 โ€” <TITLE>

- **Status:** `<ACTIVE / SUPERSEDED>`
- **Rule:** <PROJECT-SPECIFIC RULE>
- **Reason:** <WHY>
- **Approved By:** <USER / AUTHORIZED DECISION OWNER>
- **Approved At:** <ISO8601>
- **Related:** <DEC-### / REQ-### / AUTH-### / etc.>
