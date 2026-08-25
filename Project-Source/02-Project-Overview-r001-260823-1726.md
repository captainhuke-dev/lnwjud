---
project_uuid: "b077957c-5288-444b-af86-49a7ead7b584"
project_id: "LNWJUD"
project_name: "lnwjud"
document_id: "OVERVIEW-001"
document_type: "PROJECT_OVERVIEW"
semantic_slot: "02"
revision: 1
document_status: "ACTIVE"
inherits_from: ["FRAMEWORK-001"]
created_at: "2026-08-23T17:26:38+07:00"
updated_at: "2026-08-23T17:26:38+07:00"
created_by: "ACTOR-002"
created_by_instance: "INST-001"
epistemic_status: "VERIFIED"
freshness_class: "STABLE"
project_source_framework_version: "1.3.0"
project_source_schema_version: "1.0.0"
compatible_framework_range: ">=1.0,<2.0"
compatible_schema_range: ">=1.0,<2.0"
---

# 02 — Project Overview

## Project Identity
`lnwjud` is the Git-backed project `captainhuke-dev/lnwjud`, current local workspace `C:\Users\ADMINS\lnwjud`.

## Purpose / Objective
Windows-first local AI-agent runtime and MCP gateway that exposes trusted local development and Windows capabilities to AI clients through MCP.

## In Scope
Desktop control center, MCP server/gateway, workspace/file/Git/process capabilities, Windows automation, WSL integration, browser/Office integrations, durable tasks, observability, Secure MCP Tunnel integration, packaging and release verification.

## Out of Scope
Unknown beyond repository-declared scope. This Project Source does not itself authorize new application features or runtime behavior.

## Stakeholders / Systems
User/project owner; ChatGPT/MCP clients; local Codex when explicitly enabled; Windows host; OpenAI Secure MCP Tunnel; repository CI/release consumers.

## Known Constraints
Windows-first runtime; Node.js `>=24 <25`; pnpm `10.15.0`; destructive capabilities require explicit confirmation; secrets must remain external; current implementation working tree contains pre-existing WIP.

## Current High-Level Architecture / Context
Monorepo with `apps/desktop`, `apps/cli`, `packages/*`, native Windows helpers, scripts, tests, documentation and packaged tunnel client/runtime components.

## Authoritative External Sources
- Repository: `https://github.com/captainhuke-dev/lnwjud.git`
- Framework source: `https://github.com/captainhuke-dev/ProjectFramework`, bootstrap provenance at observed commit `b5a61e1dd34f3b0676dc9c0f5a2874413630d1db`.

## Project Lineage
Existing lnwjud implementation adopted ProjectFramework as a new governance layer on 2026-08-23; this is GREENFIELD Project-Source creation, not an application-code migration.

## Project-Specific Terminology
`lnwjud Desktop` = Windows control center/runtime surface; `MCP` = Model Context Protocol; `Secure MCP Tunnel` = outbound private OpenAI tunnel path; `durable task` = background task persisted beyond one MCP run.
