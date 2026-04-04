---
phase: 03-commands-execution
plan: 02
subsystem: companion-cli
tags: [companion, task, status, result, cancel, background-jobs, integration-tests, foreground-execution]
dependency_graph:
  requires: [03-01]
  provides: [task-command, status-command, result-command, cancel-command, behavioral-tests]
  affects: [03-03, 03-04, 03-05]
tech_stack:
  added: []
  patterns: ["argv flag parsing", "adapter factory switch", "config guard pattern", "realpathSync path normalization for macOS"]
key_files:
  created:
    - packages/plugin/tests/companion-task.test.ts
    - packages/plugin/tests/companion-status-result-cancel.test.ts
    - packages/plugin/tests/fixtures/shims/claude
  modified:
    - packages/plugin/src/companion/commands/task.ts
    - packages/plugin/src/companion/commands/status.ts
    - packages/plugin/src/companion/commands/result.ts
    - packages/plugin/src/companion/commands/cancel.ts
decisions:
  - "Used realpathSync to normalize macOS /var vs /private/var symlink difference — getStatePath hash must match child process.cwd() which resolves symlinks"
  - "createLogger signature is (jobId, logPath, emitLog) not (pluginDataDir, cwd, jobId) — corrected from plan doc; used getLogPath() helper"
  - "Rebuild runtime package (pnpm build) was needed before plugin typecheck because dist/index.d.ts was stale (empty export)"
metrics:
  duration_min: 14
  completed: "2026-04-04"
  tasks_completed: 3
  files_created: 3
  files_modified: 4
---

# Phase 3 Plan 02: Task, Status, Result, and Cancel Subcommands Summary

Foreground and background task execution with session flags, job status/result/cancel subcommands, and integration tests proving behavioral correctness — all 6 companion subcommands are now functional.

## Objective

Replace the 4 stub subcommands (task, status, result, cancel) with full implementations and prove correctness with behavioral integration tests using fake CLI shims and seeded job metadata.

## What Was Built

### Task Subcommand (`commands/task.ts`)

Full replacement of the `Not implemented yet` stub. Handles:
- **Argv parsing**: `--agent <id>` (required), `--background`, `--fresh`, `--resume` flags; remaining args joined as prompt.
- **Config guard**: `ConfigNotFoundError` and `ConfigValidationError` produce JSON errors + exit 1 (ERR-01, ERR-02).
- **Agent lookup**: Finds agent by id; returns JSON error with available ids on miss (CMD-05).
- **Adapter factory**: Switch on `adapterType` creates the correct adapter class from all 6 supported types.
- **Foreground execution (CMD-03)**: Calls `adapter.execute()`, persists session via `defaultHooks.saveSession()` if returned, outputs `{ output, sessionId }`.
- **Background dispatch (CMD-04, JOB-07)**: Writes job metadata BEFORE fork (critical ordering), forks detached worker via `child_process.fork()`, calls `unref()`, outputs `{ jobId, status: 'pending' }`.
- **Session flags**: `--fresh` calls `deleteSession()`, `--resume` loads existing session and passes `sessionId` to `execute()` (CMD-06, CMD-07).

### Status Subcommand (`commands/status.ts`)

Returns full `JobMetadata` JSON for the given job-id. Config guard + `validatePluginDataDir()` + `readJob()`. Returns `{ error: "Job not found" }` on miss, `{ error: "Usage: status <job-id>" }` when no arg (CMD-08, CMD-09).

### Result Subcommand (`commands/result.ts`)

Reads result file after verifying job is in `completed` state. Distinguishes failed jobs (`{ error: "Job failed: <reason>" }`) from non-completed (`{ error: "Job not completed. Current status: <status>" }`). Returns `{ jobId, output }` on success (CMD-10, CMD-11).

### Cancel Subcommand (`commands/cancel.ts`)

Writes cancel sentinel file and updates job status to `cancelled`. Guards against non-running/non-pending jobs with clear state message. Returns `{ jobId, status: 'cancelled' }` on success (CMD-12, CMD-13).

### Fake Claude Shim (`tests/fixtures/shims/claude`)

A `#!/bin/sh` script that responds to `__ADAPTER_TEST_MODE` env var: `success` returns valid claude JSON output, `error` exits 1 with stderr. Matches the runtime package shim pattern.

### Integration Tests (14 tests, all passing)

**companion-task.test.ts** (4 tests): foreground execution with shim on PATH; missing agent error; missing config error; missing `--agent` flag error.

**companion-status-result-cancel.test.ts** (10 tests):
- Status: valid job returns full metadata; unknown job-id error; missing arg usage error.
- Result: completed job with result file; running job error; failed job error with reason; unknown job-id error.
- Cancel: running job cancelled; completed job error; unknown job-id error.

Tests use `writeJob()` + `getResultPath()` directly to seed state (bypasses background worker for deterministic, fast tests). Use `realpathSync()` to normalize macOS symlink paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Runtime dist was stale — needed rebuild before plugin typecheck**
- **Found during:** Task 1 (typecheck)
- **Issue:** `packages/runtime/dist/index.d.ts` contained only `export {};` — the dist was from before Phase 2 changes were compiled. Plugin typecheck saw no exports from `@agent-plugin-cc/runtime`.
- **Fix:** Ran `pnpm --filter @agent-plugin-cc/runtime build` to regenerate declarations.
- **Files modified:** packages/runtime/dist/ (generated)
- **Commit:** N/A (build artifact, not committed)

**2. [Rule 1 - Bug] createLogger signature mismatch with plan documentation**
- **Found during:** Task 1 (typecheck)
- **Issue:** Plan doc said `createLogger(pluginDataDir, cwd, jobId)` but actual signature is `createLogger(jobId, logPath, emitLog)`. TypeScript reported type mismatch.
- **Fix:** Used `getLogPath(pluginDataDir, cwd, jobId)` to compute log path, and `defaultHooks.emitLog` for the hook. Imported `getLogPath` from runtime.
- **Files modified:** `packages/plugin/src/companion/commands/task.ts`
- **Commit:** 8c97091

**3. [Rule 1 - Bug] macOS symlink path mismatch between test and child process**
- **Found during:** Task 3 (test failures — "Job not found" on jobs that were seeded)
- **Issue:** `mkdtempSync` returns `/var/folders/...` on macOS but `process.cwd()` in child processes returns `/private/var/folders/...` (the real path). `workspaceHash()` hashed different strings, producing different state paths in test vs companion.
- **Fix:** Applied `realpathSync()` to `workspaceDir` and `pluginDataDir` in tests before computing `statePath` and passing to `runCompanion`.
- **Files modified:** `packages/plugin/tests/companion-task.test.ts`, `packages/plugin/tests/companion-status-result-cancel.test.ts`
- **Commit:** e1ccc30

## Known Stubs

| File | Description | Resolution |
|------|-------------|------------|
| `packages/plugin/src/companion/worker.ts` | Worker exits with "not yet implemented" | Plan 03-03 or subsequent plan |

## Self-Check: PASSED

Files verified:
- packages/plugin/src/companion/commands/task.ts — FOUND
- packages/plugin/src/companion/commands/status.ts — FOUND
- packages/plugin/src/companion/commands/result.ts — FOUND
- packages/plugin/src/companion/commands/cancel.ts — FOUND
- packages/plugin/tests/companion-task.test.ts — FOUND
- packages/plugin/tests/companion-status-result-cancel.test.ts — FOUND
- packages/plugin/tests/fixtures/shims/claude — FOUND

Commits verified:
- 8c97091 — feat(03-02): task subcommand with foreground execution and background dispatch
- aaef31e — feat(03-02): status, result, and cancel subcommands
- e1ccc30 — test(03-02): integration tests for task, status, result, and cancel subcommands
