---
phase: 01-foundation
plan: 02
subsystem: plugin-layout
tags: [plugin, layout, claude-code, commands, agents, companion]
dependency_graph:
  requires: [01-01]
  provides: [LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05]
  affects: [plugin-manifest, command-surface, agent-routing, companion-runtime]
tech_stack:
  added: [tsup, typescript]
  patterns: [claude-code-plugin-layout, command-stubs, tsup-bundling]
key_files:
  created:
    - packages/plugin/.claude-plugin/marketplace.json
    - packages/plugin/.claude-plugin/plugin.json
    - packages/plugin/commands/setup.md
    - packages/plugin/commands/list.md
    - packages/plugin/commands/task.md
    - packages/plugin/commands/status.md
    - packages/plugin/commands/result.md
    - packages/plugin/commands/cancel.md
    - packages/plugin/agents/delegation.md
    - packages/plugin/scripts/agents-companion.cjs
    - packages/plugin/.gitignore
  modified:
    - packages/plugin/src/companion/index.ts
    - packages/plugin/tsup.config.ts
    - packages/plugin/package.json
decisions:
  - "Use packages/plugin/.gitignore to un-ignore .claude-plugin/ and scripts/ directories which root .gitignore excluded"
  - "Set tsup entry as named object {agents-companion: src/companion/index.ts} to produce agents-companion.cjs instead of index.cjs"
metrics:
  duration_minutes: 7
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_created: 11
  files_modified: 3
---

# Phase 01 Plan 02: Plugin Layout Files Summary

Complete Claude Code plugin directory structure with marketplace manifest, plugin manifest, six command stubs, delegation subagent, and built companion script stub satisfying LAYOUT-01 through LAYOUT-05.

## What Was Built

All Claude Code plugin layout files for `packages/plugin/`:

- **LAYOUT-01**: `.claude-plugin/marketplace.json` — plugin marketplace metadata with name `agents-plugin`, owner, version, and plugins array with source reference
- **LAYOUT-02**: `.claude-plugin/plugin.json` — plugin manifest declaring commands path `./commands/` and agents path `./agents/`; commands surface as `/agents:*` 
- **LAYOUT-03**: Six command stubs (`setup`, `list`, `task`, `status`, `result`, `cancel`) with YAML frontmatter (description, argument-hint, allowed-tools) and companion script invocation bodies
- **LAYOUT-04**: `agents/delegation.md` — thin routing subagent that reads `.claude/agents.json` and invokes the best-matching agent via companion
- **LAYOUT-05**: `scripts/agents-companion.cjs` — built from TypeScript source `src/companion/index.ts` via tsup; runs and exits 0 with stub message

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dd5a849 | feat(01-02): create plugin metadata and six command stubs |
| 2 | 9aa477f | feat(01-02): create delegation agent, companion source, and build companion |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Root .gitignore excluded .claude-plugin/ and scripts/**
- **Found during:** Task 1 (git add)
- **Issue:** The root `.gitignore` ignores `.claude-plugin/` and `scripts/` (for the main Paperclip project). This blocked adding plugin layout files.
- **Fix:** Added `packages/plugin/.gitignore` with negation patterns `!.claude-plugin/` and `!scripts/` to allow these directories to be tracked within the plugin package.
- **Files modified:** `packages/plugin/.gitignore` (created)
- **Commit:** dd5a849

**2. [Rule 3 - Blocking] TypeScript not installed, tsup could not find module**
- **Found during:** Task 2 (tsup build)
- **Issue:** `npx tsup` failed with `Cannot find module 'typescript'` — package.json had no devDependencies.
- **Fix:** Ran `npm install --save-dev typescript tsup` to add required build dependencies.
- **Files modified:** `packages/plugin/package.json`, `package-lock.json`
- **Commit:** 9aa477f

**3. [Rule 1 - Bug] tsup entry produced index.cjs instead of agents-companion.cjs**
- **Found during:** Task 2 (post-build check)
- **Issue:** tsup config used `entry: ['src/companion/index.ts']` (array form) which names output after the source file (`index.cjs`). Plan requires `agents-companion.cjs`.
- **Fix:** Changed entry to named object form `{ 'agents-companion': 'src/companion/index.ts' }` so tsup produces the correct output filename.
- **Files modified:** `packages/plugin/tsup.config.ts`
- **Commit:** 9aa477f

## Known Stubs

| File | Location | Description |
|------|----------|-------------|
| `packages/plugin/scripts/agents-companion.cjs` | entire file | Phase 1 stub — prints stub message and exits; real implementation (config loader, adapters, commands) added in Phase 2+ |
| `packages/plugin/commands/*.md` | all six files | Command stubs with minimal bodies; real argument handling and output formatting added in Phase 3 |

These stubs are intentional for Phase 1 and will be wired with real implementation in subsequent phases.

## Self-Check: PASSED
