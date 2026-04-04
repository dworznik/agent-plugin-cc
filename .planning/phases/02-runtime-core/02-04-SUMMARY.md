---
phase: 02-runtime-core
plan: 04
subsystem: runtime/tests
tags: [testing, adapters, smoke-tests, fake-cli, shims]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [adapter-smoke-tests, fake-cli-shims]
  affects: [ci]
tech_stack:
  added: []
  patterns: [fake-cli-shim, PATH-override, vitest-adapter-smoke-test]
key_files:
  created:
    - packages/runtime/tests/helpers/path-override.ts
    - packages/runtime/tests/fixtures/shims/claude
    - packages/runtime/tests/fixtures/shims/codex
    - packages/runtime/tests/fixtures/shims/cursor
    - packages/runtime/tests/fixtures/shims/gemini
    - packages/runtime/tests/fixtures/shims/opencode
    - packages/runtime/tests/fixtures/shims/pi
    - packages/runtime/tests/adapters/claude-local.test.ts
    - packages/runtime/tests/adapters/codex-local.test.ts
    - packages/runtime/tests/adapters/cursor.test.ts
    - packages/runtime/tests/adapters/gemini-local.test.ts
    - packages/runtime/tests/adapters/opencode-local.test.ts
    - packages/runtime/tests/adapters/pi-local.test.ts
  modified: []
decisions:
  - "Fake CLI shims use __ADAPTER_TEST_MODE env var (success/error/timeout) to avoid requiring real CLI binaries in CI"
  - "PATH override helper uses beforeAll to chmod shims and beforeEach/afterEach to scope PATH injection — avoids per-test chmod overhead"
metrics:
  duration: 15
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 13
  files_modified: 0
---

# Phase 02 Plan 04: Adapter Smoke Tests Summary

**One-liner:** Six fake CLI shims with success/error/timeout modes and corresponding vitest smoke tests covering all six adapter classes without real AI binaries.

## What Was Built

Added fake CLI shims for all six local adapters (claude, codex, cursor, gemini, opencode, pi) under `tests/fixtures/shims/`. Each shim is a shell script that checks the `__ADAPTER_TEST_MODE` environment variable and emits fixture output, exits with error, or sleeps indefinitely to simulate the three test scenarios.

Added `tests/helpers/path-override.ts` with `useShimPath()` that prepends the shims directory to `PATH` in vitest lifecycle hooks, making fake binaries discoverable without modifying any global state permanently.

Added six adapter smoke test files (`tests/adapters/*.test.ts`) covering:
- Successful output parsing (output text + sessionId extraction)
- Non-zero exit handling (expects `AdapterProcessError`)
- Timeout kill (expects `AdapterTimeoutError` with 200ms budget)

## Test Results

Full test suite: **63 tests, 13 test files, all passing**

Breakdown:
- Pre-existing unit tests: 45 tests (config, process, session, hooks, smoke)
- New adapter smoke tests: 18 tests (3 per adapter x 6 adapters)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check

### Created files exist:

- [x] packages/runtime/tests/helpers/path-override.ts
- [x] packages/runtime/tests/fixtures/shims/claude
- [x] packages/runtime/tests/fixtures/shims/codex
- [x] packages/runtime/tests/fixtures/shims/cursor
- [x] packages/runtime/tests/fixtures/shims/gemini
- [x] packages/runtime/tests/fixtures/shims/opencode
- [x] packages/runtime/tests/fixtures/shims/pi
- [x] packages/runtime/tests/adapters/claude-local.test.ts
- [x] packages/runtime/tests/adapters/codex-local.test.ts
- [x] packages/runtime/tests/adapters/cursor.test.ts
- [x] packages/runtime/tests/adapters/gemini-local.test.ts
- [x] packages/runtime/tests/adapters/opencode-local.test.ts
- [x] packages/runtime/tests/adapters/pi-local.test.ts

### Commits exist:

- [x] f17535e — feat(02-04): create PATH override helper and 6 fake CLI shims
- [x] 28e8347 — feat(02-04): create adapter smoke tests for all six adapters

## Self-Check: PASSED
