---
phase: 03-commands-execution
plan: 03
subsystem: companion
tags: [worker, background-jobs, cancel-polling, adapter-execution, job-lifecycle]

requires:
  - phase: 03-01
    provides: job.ts metadata module (updateJob, getResultPath, getCancelPath)
  - phase: 02
    provides: runtime package (adapters, createLogger, getLogPath, getStatePath, validatePluginDataDir, defaultHooks)

provides:
  - Background job worker entry point (agents-worker.cjs)
  - Full JOB-01 through JOB-06 lifecycle: pending -> running -> completed/failed/cancelled
  - Cancel sentinel polling at 1s interval
  - Result file persistence on success
  - Session save if adapter returns sessionId
  - Error details written to job metadata on failure

affects: [03-04, 03-05]

tech-stack:
  added: []
  patterns:
    - "Cancel sentinel polling with setInterval + existsSync flag check"
    - "cancelled boolean guard to prevent terminal status writes after cancellation"
    - "Adapter factory function switching on adapterType"
    - "IIFE async immediately-invoked for top-level await in CommonJS target"

key-files:
  created: []
  modified:
    - packages/plugin/src/companion/worker.ts
    - packages/plugin/scripts/agents-worker.cjs

key-decisions:
  - "Worker uses createLogger(jobId, logPath, emitLog) — actual runtime API differs from plan pseudocode which showed createLogger(pluginDataDir, workspaceRoot, jobId); composed logPath via getLogPath before calling createLogger"
  - "Worker uses IIFE async pattern for top-level await instead of a named async main() — matches tsup CJS output requirements"

patterns-established:
  - "cancelled flag guard: set flag before process.exit in poll interval; check flag after clearInterval in adapter resolve/reject to skip status writes"
  - "Adapter factory: switch on agentCfg.adapterType, return concrete adapter instance with no config forwarding (adapters use env/defaults)"

requirements-completed: [JOB-01, JOB-02, JOB-03, JOB-04, JOB-05, JOB-06, ERR-04]

duration: 15min
completed: 2026-04-04
---

# Phase 3 Plan 03: Background Job Worker Summary

**Detached worker entry point implementing the full job lifecycle: argv parsing, status transitions, adapter execution with cancel-sentinel polling at 1s, result persistence, and error recording in job metadata.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-04T10:35:00Z
- **Completed:** 2026-04-04T10:50:14Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Implemented `packages/plugin/src/companion/worker.ts` — the detached Node process forked by the task subcommand for background jobs
- Worker handles all terminal states: completed, failed, cancelled (via sentinel file detection)
- TypeScript compilation and tsup build both pass; `agents-worker.cjs` (188KB) produced successfully

## Task Commits

1. **Task 1: Background worker with adapter execution, result persistence, cancel polling** - `03a25fc` (feat)

## Files Created/Modified

- `packages/plugin/src/companion/worker.ts` — Full worker implementation: argv parsing, job lifecycle, adapter factory, cancel polling, result/session persistence
- `packages/plugin/scripts/agents-worker.cjs` — Compiled tsup bundle (188KB) including bundled runtime

## Decisions Made

- **createLogger API deviation:** The plan pseudocode showed `createLogger(pluginDataDir, workspaceRoot, jobId)` but the actual runtime exports `createLogger(jobId, logPath, emitLog)`. Composed `logPath` from `getLogPath(pluginDataDir, cwd, jobId)` and passed `defaultHooks.emitLog` as the emitLog callback. (Rule 1 adaptation — not a bug in the plan, just pseudocode vs. actual API.)
- **IIFE async pattern:** Worker uses `(async () => { ... })()` for top-level await in a CommonJS tsup target rather than a named `async function main()`. Both work; IIFE is idiomatic for standalone scripts.

## Deviations from Plan

### Auto-adapted Issues

**1. [Rule 1 - Adaptation] createLogger signature differs from plan pseudocode**
- **Found during:** Task 1 (reading runtime logger source)
- **Issue:** Plan showed `createLogger(pluginDataDir, workspaceRoot, jobId)` but actual runtime API is `createLogger(jobId, logPath, emitLog)`. Plan pseudocode was illustrative, not literal.
- **Fix:** Used `getLogPath(pluginDataDir, cwd, jobId)` to compute logPath, passed `defaultHooks.emitLog` for emitLog. Semantically equivalent.
- **Files modified:** packages/plugin/src/companion/worker.ts
- **Verification:** TypeScript type-checks pass with zero errors
- **Committed in:** 03a25fc

---

**Total deviations:** 1 adaptation (API pseudocode vs actual signature)
**Impact on plan:** No scope change — functionally identical to plan intent.

## Issues Encountered

- Worktree branch was at `main` (Phase 2 merge commit) — plan 03-01 work was in `feature/phase-03-commands-execution`. Merged that branch before implementation to get `job.ts`, command stubs, and tsup config.
- Runtime package needed building before tsup could resolve `@agent-plugin-cc/runtime` imports. Ran `pnpm --filter @agent-plugin-cc/runtime build` before plugin build.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Worker implementation complete — Plan 03-04 (status/result/cancel commands) can now read job state and results that the worker writes
- Plan 03-05 (integration tests) can spawn worker process against fake CLI shims and assert on job metadata files
- All JOB-01 through JOB-06 and ERR-04 requirements satisfied

## Self-Check: PASSED

Files verified:
- packages/plugin/src/companion/worker.ts — FOUND
- packages/plugin/scripts/agents-worker.cjs — FOUND

Commits verified:
- 03a25fc — FOUND (feat: background job worker with cancel polling)
- ea4311e — FOUND (docs: complete background job worker plan)

---
*Phase: 03-commands-execution*
*Completed: 2026-04-04*
