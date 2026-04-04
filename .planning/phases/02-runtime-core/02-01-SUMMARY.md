---
phase: 02-runtime-core
plan: "01"
subsystem: runtime
tags: [zod, typescript, config-loader, child-process, json-parsing, unit-tests]

requires:
  - phase: 02-runtime-core
    provides: vitest test runner configured for packages/runtime, split tsconfig, test infrastructure

provides:
  - All shared TypeScript types and interfaces in packages/runtime/src/types.ts
  - Zod config schema with discriminated union for adapterConfig in packages/runtime/src/config/schema.ts
  - Config file discovery (walk-up) and validation in packages/runtime/src/config/loader.ts
  - Child process spawning with AbortController timeout in packages/runtime/src/process/runner.ts
  - Safe JSON and JSONL parsing utilities in packages/runtime/src/process/parse.ts
  - 31 unit tests across all four modules (schema, loader, runner, parse)

affects: [02-02, 02-03, 02-04, 03-commands]

tech-stack:
  added: []
  patterns:
    - "Zod discriminated union for per-adapter config validation (adapterType as discriminant)"
    - "Walk-up config discovery from cwd to filesystem root"
    - "AbortController-based child process timeout with ABORT_ERR detection"
    - "Safe parse wrappers that never throw (return null or empty array)"

key-files:
  created:
    - packages/runtime/src/types.ts
    - packages/runtime/src/config/schema.ts
    - packages/runtime/src/config/loader.ts
    - packages/runtime/src/process/runner.ts
    - packages/runtime/src/process/parse.ts
    - packages/runtime/tests/helpers/env-setup.ts
    - packages/runtime/tests/config/schema.test.ts
    - packages/runtime/tests/config/loader.test.ts
    - packages/runtime/tests/process/runner.test.ts
    - packages/runtime/tests/process/parse.test.ts
  modified: []

key-decisions:
  - "ConfigValidationError carries fieldPath property for human-readable Zod error reporting at the failing path"
  - "spawnWithTimeout creates its own AbortController per call; external signal (opts.signal) chains into the internal AC"
  - "parseJSON and parseJSONL use try/catch internally and never surface exceptions to callers"

patterns-established:
  - "ConfigNotFoundError / ConfigValidationError / PluginDataError: typed error classes for config failures"
  - "AdapterTimeoutError / AdapterProcessError: typed error classes for process failures"
  - "spawnWithTimeout: standard child process wrapper all adapters will use"

requirements-completed: [CONF-01, CONF-02, CONF-03, CONF-04, ADPT-09, ADPT-10, ERR-05]

duration: 5min
completed: 2026-04-04
---

# Phase 2 Plan 1: Runtime Foundation Summary

**Zod-validated agents.json config loader with walk-up discovery, AbortController child process runner with timeout, and safe JSON/JSONL parsers — 31 unit tests across all four modules**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T22:06:21Z
- **Completed:** 2026-04-03T22:11:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Created all shared TypeScript types and interfaces (AgentsConfig, ProcessResult, AdapterResult, SessionData, LogEntry, HookSet, etc.)
- Created Zod schemas with `z.discriminatedUnion('adapterType', [...])` for six local CLI adapters
- Config loader with directory walk-up, JSON parse error handling, and typed Zod validation errors that name the failing field path
- Process runner using AbortController timeout with correct ABORT_ERR detection for accurate AdapterTimeoutError propagation
- Safe JSON and JSONL parsers that never throw — return null/empty array on malformed input
- 31 unit tests all passing including timeout test with 100ms deadline on `sleep 10`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared types and Zod config schema** - `a666e5a` (feat)
2. **Task 2: Create config loader, process runner, parsers, and unit tests** - `0ee6a6a` (feat)

**Plan metadata:** _(pending final docs commit)_

## Files Created/Modified

- `packages/runtime/src/types.ts` - All shared TypeScript interfaces: AdapterType, AgentConfig, AgentsConfig, ProcessResult, AdapterResult, ExecuteOptions, SessionData, LogEntry, HookSet
- `packages/runtime/src/config/schema.ts` - Zod schemas: AgentsConfigSchema, AgentSchema, AdapterConfigSchema (discriminated union), ADAPTER_TYPES
- `packages/runtime/src/config/loader.ts` - findConfigPath, loadConfig, validatePluginDataDir with ConfigNotFoundError, ConfigValidationError, PluginDataError
- `packages/runtime/src/process/runner.ts` - spawnWithTimeout with AbortController timeout, AdapterTimeoutError, AdapterProcessError
- `packages/runtime/src/process/parse.ts` - parseJSON, parseJSONL safe parsers
- `packages/runtime/tests/helpers/env-setup.ts` - useTestPluginData() helper using tmp dirs
- `packages/runtime/tests/config/schema.test.ts` - 8 schema validation tests
- `packages/runtime/tests/config/loader.test.ts` - 8 loader and validator tests
- `packages/runtime/tests/process/parse.test.ts` - 10 JSON/JSONL parser tests
- `packages/runtime/tests/process/runner.test.ts` - 5 process runner tests including timeout

## Decisions Made

- ConfigValidationError carries a `fieldPath` property to surface the exact Zod path to the failing field, satisfying the "human-readable error naming the failing field path" requirement
- spawnWithTimeout creates an internal AbortController per call and chains any external `opts.signal` into it, so timeout and external cancellation both route to the same error path
- parseJSON returns `null` for the JSON literal `null` as well as parse errors — callers must check for null regardless, so this is consistent behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All six adapter implementations in 02-02 can import from types.ts and use spawnWithTimeout
- Session module in 02-03 can import SessionData and HookSet from types.ts
- Companion in 02-04 can use loadConfig, validatePluginDataDir, and all process utilities
- Test helper useTestPluginData() is available for all subsequent plans needing CLAUDE_PLUGIN_DATA isolation

---
*Phase: 02-runtime-core*
*Completed: 2026-04-04*

## Self-Check: PASSED

- packages/runtime/src/types.ts: FOUND
- packages/runtime/src/config/schema.ts: FOUND
- packages/runtime/src/config/loader.ts: FOUND
- packages/runtime/src/process/runner.ts: FOUND
- packages/runtime/src/process/parse.ts: FOUND
- packages/runtime/tests/helpers/env-setup.ts: FOUND
- packages/runtime/tests/config/schema.test.ts: FOUND
- packages/runtime/tests/config/loader.test.ts: FOUND
- packages/runtime/tests/process/parse.test.ts: FOUND
- packages/runtime/tests/process/runner.test.ts: FOUND
- Commit a666e5a: FOUND
- Commit 0ee6a6a: FOUND
