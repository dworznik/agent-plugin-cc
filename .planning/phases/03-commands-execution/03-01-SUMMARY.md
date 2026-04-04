---
phase: 03-commands-execution
plan: 01
subsystem: companion-cli
tags: [companion, cli, commands, setup, list, job-metadata, tsup, integration-tests]
dependency_graph:
  requires: [02-04]
  provides: [companion-dispatch, setup-command, list-command, job-metadata, worker-entry]
  affects: [03-02, 03-03, 03-04, 03-05]
tech_stack:
  added: ["@agent-plugin-cc/runtime workspace dependency in plugin package"]
  patterns: ["subcommand dispatch table", "child-process test runner", "temp-dir test isolation"]
key_files:
  created:
    - packages/plugin/src/companion/index.ts
    - packages/plugin/src/companion/job.ts
    - packages/plugin/src/companion/worker.ts
    - packages/plugin/src/companion/commands/setup.ts
    - packages/plugin/src/companion/commands/list.ts
    - packages/plugin/src/companion/commands/task.ts
    - packages/plugin/src/companion/commands/status.ts
    - packages/plugin/src/companion/commands/result.ts
    - packages/plugin/src/companion/commands/cancel.ts
    - packages/plugin/tests/helpers/companion-runner.ts
    - packages/plugin/tests/helpers/temp-env.ts
    - packages/plugin/tests/companion-setup.test.ts
    - packages/plugin/tests/companion-list.test.ts
  modified:
    - packages/plugin/tsup.config.ts
    - packages/plugin/package.json
    - packages/runtime/package.json
decisions:
  - "Stub commands for task/status/result/cancel created immediately to keep dispatch table compile-clean; Plans 02/03 replace them"
  - "runtime package.json corrected: main/exports use .js extension to match tsc NodeNext output (was .cjs which caused tsup esbuild resolution failure)"
  - "worker.ts stub included in tsup entry from the start so Plans 02/03 can implement without tsup config changes"
metrics:
  duration_min: 25
  completed: "2026-04-04"
  tasks_completed: 3
  files_created: 13
  files_modified: 3
---

# Phase 3 Plan 01: Companion CLI Entry Point, Setup/List Commands, and Job Metadata Summary

Companion CLI dispatch table, setup/list subcommands, job metadata module, tsup worker entry, and integration tests — all wired against the runtime package.

## Objective

Establish the companion CLI infrastructure that all subsequent plans build on: a subcommand dispatch table, the two config-focused commands (setup, list), the job metadata module needed by background job plans, and behavioral integration tests proving correctness.

## What Was Built

### Companion CLI Entry Point (`companion/index.ts`)
Replaced the Phase 1 stub with a real dispatch table routing `argv[2]` to one of 6 named command handlers. Unknown subcommands emit a JSON error and exit 1. Handles rejected promise by catching and emitting JSON error.

### Job Metadata Module (`companion/job.ts`)
`JobStatus` union type (`pending | running | completed | failed | cancelled`) and `JobMetadata` interface. Path helpers: `getJobPath`, `getResultPath`, `getCancelPath`. CRUD: `readJob` (returns null if missing), `writeJob` (mkdirSync for parent), `updateJob` (throws on missing job).

### tsup Config Update
Added `agents-worker` entry pointing to `src/companion/worker.ts` alongside the existing `agents-companion` entry. Both produce `.cjs` bundles under `scripts/`.

### Setup Subcommand (`commands/setup.ts`)
Accepts `--config '<json>'`, parses and validates with `AgentsConfigSchema`, writes to `<cwd>/.claude/agents.json`. Returns `{ success, path, agents }` on success, `{ error }` + exit 1 on failure (missing flag, invalid JSON, schema violation with fieldPath).

### List Subcommand (`commands/list.ts`)
Calls `loadConfig(cwd)`, maps agents to `{ id, label, description, adapterType }`. Returns `{ agents, defaultAgent }` on success. `ConfigNotFoundError` produces `{ error: 'No agents.json found...' }` + exit 1. `ConfigValidationError` produces `{ error: message }` + exit 1.

### Test Helpers
- `companion-runner.ts`: runs bundled `agents-companion.cjs` as child process, returns `{ stdout, stderr, exitCode, json }`.
- `temp-env.ts`: `useTempEnv()` creates an isolated tmp directory per test with `beforeEach`/`afterEach` cleanup. `writeAgentsConfig()` writes config to `<workspace>/.claude/agents.json`.

### Integration Tests (7 tests, all passing)
**companion-setup.test.ts** (4 tests): valid config writes file and returns success JSON; empty agents fails validation; non-JSON input returns JSON error; missing `--config` flag returns usage JSON.
**companion-list.test.ts** (3 tests): valid config returns agents array with correct fields and `defaultAgent`; missing config returns JSON error with exit 1; invalid config (empty agents) returns validation JSON error with exit 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed runtime package.json exports pointing to non-existent .cjs files**
- **Found during:** Task 3 (running `pnpm build`)
- **Issue:** `packages/runtime/package.json` had `"main": "./dist/index.cjs"` and `"require": "./dist/index.cjs"` but `tsc` with `module: NodeNext` produces `.js` files. tsup's esbuild couldn't resolve `@agent-plugin-cc/runtime` — build failed.
- **Fix:** Updated `main` to `./dist/index.js` and exports to use `./dist/index.js` for both `import` and `require`, with `types` first (correct order for bundlers).
- **Files modified:** `packages/runtime/package.json`
- **Commit:** 7f461f0

**2. [Rule 2 - Missing] Added @agent-plugin-cc/runtime as workspace dependency to plugin**
- **Found during:** Task 1 (typecheck)
- **Issue:** Plugin package.json had no dependency on `@agent-plugin-cc/runtime` so TypeScript couldn't resolve the module.
- **Fix:** `pnpm add --filter "agent-plugin-cc" "@agent-plugin-cc/runtime@workspace:*"` added to package.json.
- **Files modified:** `packages/plugin/package.json`, `pnpm-lock.yaml`
- **Commit:** 6f664df

## Known Stubs

| File | Description | Resolution |
|------|-------------|------------|
| `packages/plugin/src/companion/commands/task.ts` | Returns `{ error: 'Not implemented yet' }` | Plan 03-02 |
| `packages/plugin/src/companion/commands/status.ts` | Returns `{ error: 'Not implemented yet' }` | Plan 03-03 |
| `packages/plugin/src/companion/commands/result.ts` | Returns `{ error: 'Not implemented yet' }` | Plan 03-03 |
| `packages/plugin/src/companion/commands/cancel.ts` | Returns `{ error: 'Not implemented yet' }` | Plan 03-03 |
| `packages/plugin/src/companion/worker.ts` | Worker not yet implemented | Plan 03-02 |

These stubs are intentional — they keep the dispatch table compile-clean while Plans 02/03 implement the background job system.

## Self-Check: PASSED

Files verified:
- packages/plugin/src/companion/index.ts — FOUND
- packages/plugin/src/companion/job.ts — FOUND
- packages/plugin/src/companion/commands/setup.ts — FOUND
- packages/plugin/src/companion/commands/list.ts — FOUND
- packages/plugin/tests/companion-setup.test.ts — FOUND
- packages/plugin/tests/companion-list.test.ts — FOUND
- packages/plugin/scripts/agents-companion.cjs — FOUND
- packages/plugin/scripts/agents-worker.cjs — FOUND

Commits verified:
- 6f664df — FOUND (Task 1: companion CLI dispatch, job metadata module)
- 7f461f0 — FOUND (Task 3: integration tests for setup and list)
