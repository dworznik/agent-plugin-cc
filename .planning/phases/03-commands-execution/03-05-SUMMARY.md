---
phase: 03-commands-execution
plan: 05
subsystem: testing
tags: [vitest, integration-tests, background-jobs, lifecycle, child_process, spawn]

# Dependency graph
requires:
  - phase: 03-commands-execution/03-01
    provides: companion test helpers (runCompanion, useTempEnv, writeAgentsConfig)
  - phase: 03-commands-execution/03-02
    provides: task/status/result/cancel command implementations and fake CLI shims
  - phase: 03-commands-execution/03-03
    provides: background job worker (agents-worker.cjs) with cancel sentinel polling
provides:
  - Background job lifecycle integration test suite (dispatch, status poll, result, cancel)
  - Bug fix: worker process properly detaches from parent (spawn vs fork)
affects: [ci, 03-commands-execution]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Background job lifecycle testing with polling: dispatch -> poll status -> cancel/result"
    - "Use spawn() not fork() for truly detached child processes (fork creates IPC channel)"

key-files:
  created:
    - packages/plugin/tests/companion-job-lifecycle.test.ts
  modified:
    - packages/plugin/src/companion/commands/task.ts
    - packages/plugin/scripts/agents-companion.cjs

key-decisions:
  - "Replace fork() with spawn(process.execPath, ...) for worker process — fork() creates an IPC channel that keeps the parent alive even with unref(), preventing true background detachment"
  - "Cancel test uses 3s __ADAPTER_TEST_DELAY to reliably catch the running state window"
  - "Cancel test needs { timeout: 15000 } override since it must poll for running state, cancel, then confirm cancelled"

patterns-established:
  - "pollJobStatus helper: polls companion status command every 250ms up to 8s timeout"
  - "Each lifecycle test gets fresh temp dir via useTempEnv() for isolation"
  - "PATH includes shims directory; __ADAPTER_TEST_MODE=success passed in env to runCompanion"

requirements-completed: [TEST-05]

# Metrics
duration: 25min
completed: 2026-04-04
---

# Phase 03 Plan 05: Background Job Lifecycle Tests Summary

**End-to-end lifecycle integration tests covering spawn/poll/result/cancel flow using fake shims, plus bug fix replacing fork() with spawn() to enable true background detachment**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-04T11:15:00Z
- **Completed:** 2026-04-04T11:31:11Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Background job lifecycle fully tested end-to-end: dispatch returns job-id immediately, status polls through pending/running/completed, result retrieves adapter output, cancel stops a running job
- Fixed critical bug: `fork()` in task.ts was preventing background detachment due to implicit IPC channel; replaced with `spawn(process.execPath, ...)` which has no IPC channel
- All 66 tests pass (6 lifecycle + 60 from previous plans)
- Total lifecycle test suite runs in under 2 seconds

## Task Commits

1. **Task 1: Background job lifecycle integration tests** - `b2e134e` (test)

## Files Created/Modified

- `packages/plugin/tests/companion-job-lifecycle.test.ts` - 6 lifecycle integration tests using fake shims
- `packages/plugin/src/companion/commands/task.ts` - Fixed: spawn() instead of fork() for worker detachment
- `packages/plugin/scripts/agents-companion.cjs` - Rebuilt bundle reflecting spawn() fix

## Decisions Made

- **spawn() over fork():** Node.js `fork()` always creates an IPC channel. Even with `detached: true` and `worker.unref()`, the IPC channel keeps the parent's event loop alive until the child closes it — making the companion block for the full duration of the adapter execution. `spawn(process.execPath, [...workerArgs])` with `detached: true, stdio: 'ignore'` has no IPC channel and detaches properly.

- **Cancel test timeout:** The vitest default 5000ms timeout is too short for the cancel lifecycle (dispatch + poll-to-running + cancel + poll-to-cancelled with 3s adapter delay). Used `{ timeout: 15000 }` on that test.

- **3s delay for cancel test:** `__ADAPTER_TEST_DELAY=3` provides a wide enough window to reliably catch the `running` state before the job completes. The worker's cancel sentinel poll interval is 1000ms, so cancel detection adds up to 1s overhead after sentinel is written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fork() causing companion to block until worker completes**
- **Found during:** Task 1 (background job lifecycle tests)
- **Issue:** `child_process.fork()` creates an IPC channel that keeps the parent process alive even with `detached: true` and `worker.unref()`. The companion waited 3+ seconds (adapter delay) before returning, making dispatch appear synchronous and the job immediately `completed` by the time any poll ran.
- **Fix:** Replaced `fork()` with `spawn(process.execPath, [workerPath, ...args], { detached: true, stdio: 'ignore' })` — no IPC channel means true detachment; dispatch returns in ~70ms.
- **Files modified:** `packages/plugin/src/companion/commands/task.ts`, `packages/plugin/scripts/agents-companion.cjs`
- **Verification:** Dispatch returns in <100ms; status transitions through `pending -> running -> completed` observable across poll interval; all 6 lifecycle tests pass.
- **Committed in:** `b2e134e`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix. Without it, background jobs didn't actually run in background, making the entire lifecycle test flow impossible to test. No scope creep.

## Issues Encountered

- The `fork()` vs `spawn()` bug was subtle: the compiled bundle showed `detached: true` and `worker.unref()` — correct on the surface. The issue only became apparent when measuring dispatch timing (70ms expected, 3000ms actual). The root cause is Node.js-specific: `fork()` always opens an IPC channel and `unref()` only unrefs the stdio streams, not the IPC channel.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 03 plans 01-05 complete: setup/list/task/status/result/cancel commands, background worker, delegation subagent, and full lifecycle test coverage
- All 66 tests pass without real AI CLI binaries
- Plugin is ready for Phase 03 integration verification

---
*Phase: 03-commands-execution*
*Completed: 2026-04-04*

## Self-Check: PASSED

- FOUND: packages/plugin/tests/companion-job-lifecycle.test.ts
- FOUND: .planning/phases/03-commands-execution/03-05-SUMMARY.md
- FOUND: b2e134e commit (test(03-05): add background job lifecycle integration tests)
