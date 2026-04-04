---
phase: 02-runtime-core
plan: 03
subsystem: adapters
tags: [typescript, node, cli-adapters, template-method, process-spawn, session-encode]

# Dependency graph
requires:
  - phase: 02-runtime-core plan 01
    provides: types.ts, process/runner.ts (spawnWithTimeout, AdapterTimeoutError, AdapterProcessError), process/parse.ts (parseJSON, parseJSONL)
  - phase: 02-runtime-core plan 02
    provides: logging/logger.ts (Logger interface), session/, hooks/defaults.ts

provides:
  - BaseAdapter abstract class with template-method execute(), timeout, error wrapping, LOG-02 logging
  - ClaudeLocalAdapter (claude -p --output-format json)
  - CodexLocalAdapter (codex exec --json with JSONL event parsing)
  - CursorAdapter (cursor agent --print --output-format json --trust)
  - GeminiLocalAdapter (gemini -o json)
  - OpencodeLocalAdapter (opencode run --format json)
  - PiLocalAdapter (pi --mode json with path-based --session)
  - Complete runtime index.ts re-exports for @agent-plugin-cc/runtime public API

affects: [02-04, companion-script, plugin-commands]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Template-method pattern for adapter execution (BaseAdapter.execute handles cross-cutting concerns)
    - Stateless adapters (no session stored in adapter instance)
    - parseJSON/parseJSONL exclusively (no raw JSON.parse in adapter code)
    - Optional Logger parameter for execution timing (LOG-02 pattern)

key-files:
  created:
    - packages/runtime/src/adapters/base.ts
    - packages/runtime/src/adapters/claude-local.ts
    - packages/runtime/src/adapters/codex-local.ts
    - packages/runtime/src/adapters/cursor.ts
    - packages/runtime/src/adapters/gemini-local.ts
    - packages/runtime/src/adapters/opencode-local.ts
    - packages/runtime/src/adapters/pi-local.ts
  modified:
    - packages/runtime/src/index.ts

key-decisions:
  - "BaseAdapter.execute() accepts optional Logger rather than requiring it — adapters work in test contexts without logging"
  - "Pi adapter --session passes raw stored string (file path or ID) not a bare UUID, matching Pi's path-based session storage under ~/.pi/agent/sessions/"
  - "CursorAdapter adds --trust flag to all invocations per RESEARCH.md confirmed headless mode"
  - "Each adapter throws AdapterProcessError when JSON/JSONL parse returns null, providing descriptive diagnostic message"

patterns-established:
  - "Template-method: BaseAdapter.execute() handles timeout, logging, error wrapping; subclasses only implement buildArgs/parseOutput/encodeSession/decodeSession"
  - "Stateless adapters: no mutable instance state; sessionId only passed via execute() opts"
  - "parseJSON/parseJSONL exclusively: never use raw JSON.parse in adapter implementations"

requirements-completed: [ERR-03, LOG-02, ADPT-03, ADPT-04, ADPT-05, ADPT-06, ADPT-07, ADPT-08]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 02 Plan 03: Adapter Implementations Summary

**BaseAdapter template-method class and six CLI adapters (claude, codex, cursor, gemini, opencode, pi) with LOG-02 execution timing, typed error wrapping, and complete runtime package re-exports**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T22:29:51Z
- **Completed:** 2026-04-03T22:33:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- BaseAdapter abstract class with template-method execute() handling timeout, error wrapping, and optional Logger integration for execution timing (LOG-02)
- All six adapter subclasses correctly invoke their CLI binaries with proper non-interactive flags and parse JSON/JSONL output
- Pi adapter uses path-based --session flag per RESEARCH.md confirmed behavior
- Runtime index.ts re-exports complete public API: types, config, adapters, process utilities, session, hooks, logging

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BaseAdapter abstract class** - `7644080` (feat)
2. **Task 2: Implement six adapters + wire index.ts** - `7fc2b70` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/runtime/src/adapters/base.ts` - BaseAdapter with template-method execute(), optional Logger, timeout/error handling
- `packages/runtime/src/adapters/claude-local.ts` - ClaudeLocalAdapter: `claude -p ... --output-format json`
- `packages/runtime/src/adapters/codex-local.ts` - CodexLocalAdapter: `codex exec ... --json`, JSONL event stream parsing
- `packages/runtime/src/adapters/cursor.ts` - CursorAdapter: `cursor agent --print ... --output-format json --trust`
- `packages/runtime/src/adapters/gemini-local.ts` - GeminiLocalAdapter: `gemini ... -o json`
- `packages/runtime/src/adapters/opencode-local.ts` - OpencodeLocalAdapter: `opencode run ... --format json`
- `packages/runtime/src/adapters/pi-local.ts` - PiLocalAdapter: `pi --mode json ...` with path-based `--session`
- `packages/runtime/src/index.ts` - Complete public re-exports for @agent-plugin-cc/runtime

## Decisions Made
- BaseAdapter.execute() accepts Logger as optional third parameter so adapters are usable in tests without a logger
- Pi adapter decodeSession returns raw string (may be a file path, not a UUID) matching Pi's `~/.pi/agent/sessions/` storage model
- CursorAdapter always adds `--trust` to buildArgs per research confirming it required for headless mode
- Adapters throw AdapterProcessError with descriptive message when parseJSON/parseJSONL returns null

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

The worktree was created from the Phase 1 branch and was missing all Phase 2 runtime files. Merged `feature/phase-02-runtime-core` into the worktree branch before starting task execution. This is normal parallel-execution setup, not a plan deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All six adapters complete; ready for Plan 02-04 (adapter smoke tests with fake CLIs)
- Runtime package public API is fully wired via index.ts
- No blockers

---
*Phase: 02-runtime-core*
*Completed: 2026-04-03*
