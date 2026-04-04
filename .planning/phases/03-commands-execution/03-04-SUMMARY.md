---
phase: 03-commands-execution
plan: "04"
subsystem: commands
tags: [commands, delegation, claude-instructions, companion]
dependency_graph:
  requires: [03-02, 03-03]
  provides: [command-md-files, delegation-subagent]
  affects: [packages/plugin/commands, packages/plugin/agents]
tech_stack:
  added: []
  patterns: [companion-json-invocation, conversational-wizard, semantic-delegation]
key_files:
  created: []
  modified:
    - packages/plugin/commands/setup.md
    - packages/plugin/commands/list.md
    - packages/plugin/commands/task.md
    - packages/plugin/commands/status.md
    - packages/plugin/commands/result.md
    - packages/plugin/commands/cancel.md
    - packages/plugin/agents/delegation.md
decisions:
  - "Command .md files instruct Claude to invoke agents-companion.cjs and parse JSON output rather than using bare ! pass-through"
  - "Delegation subagent uses companion list (not direct agents.json read) as single source of truth per D-12"
  - "Delegation invokes exactly one agent using Claude's semantic judgment on description fields"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 7
---

# Phase 3 Plan 4: Command .md Files and Delegation Subagent Summary

**One-liner:** Real Claude instruction files for all six commands (companion JSON invocation, wizard setup, table display) plus delegation subagent updated to use companion list for agent discovery.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Command .md files for all six commands | 8583aed | setup.md, list.md, task.md, status.md, result.md, cancel.md |
| 2 | Delegation subagent with companion list integration | 27d2002 | delegation.md |

## What Was Built

### Task 1: All Six Command Files

Replaced Phase 1 stub files (bare `!` pass-through) with real Claude instruction files:

- **setup.md**: Multi-step conversational wizard — greets user, collects agent details (id, label, description, adapterType, per-adapter optional fields), assembles JSON config, calls `companion setup --config '<json>'`, and handles success/error response.
- **list.md**: Fetches agents via `companion list`, displays as markdown table (ID, Label, Description, Adapter Type), notes defaultAgent.
- **task.md**: Parses `--agent`, `--background`, `--fresh`, `--resume` flags and prompt from `$ARGUMENTS`, invokes `companion task`, presents foreground output inline or background jobId with follow-up instructions.
- **status.md**: Calls `companion status <job-id>`, displays job metadata (jobId, agentId, status, startTime, endTime, error).
- **result.md**: Calls `companion result <job-id>`, displays agent output or error.
- **cancel.md**: Calls `companion cancel <job-id>`, confirms cancellation or shows error.

All files retain correct YAML frontmatter with `description:` and `allowed-tools: Bash(node:*)`.

### Task 2: Delegation Subagent

Updated from reading `agents.json` directly to using `companion list` per D-12. Claude uses its own semantic judgment to match the user task to the agent with the best-matching `description`. Invokes exactly ONE agent. Falls back to showing all agents in a table and prompting the user to choose when no clear match exists.

## Verification

- All 6 command files reference `agents-companion.cjs` with correct subcommand
- Delegation uses `companion list` — no direct `agents.json` access
- Phase 1 layout conformance test: 60/60 tests pass

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all command files provide complete, production-ready Claude instructions.

## Self-Check: PASSED

Files verified present:
- packages/plugin/commands/setup.md: FOUND
- packages/plugin/commands/list.md: FOUND
- packages/plugin/commands/task.md: FOUND
- packages/plugin/commands/status.md: FOUND
- packages/plugin/commands/result.md: FOUND
- packages/plugin/commands/cancel.md: FOUND
- packages/plugin/agents/delegation.md: FOUND

Commits verified:
- 8583aed: FOUND (feat(03-04): replace command stub .md files with real Claude instructions)
- 27d2002: FOUND (feat(03-04): update delegation subagent to use companion list for agent discovery)
