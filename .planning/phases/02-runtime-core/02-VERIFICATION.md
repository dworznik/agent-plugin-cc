---
phase: 02-runtime-core
verified: 2026-04-04T05:52:00Z
status: passed
score: 24/24 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 02: Runtime Core Verification Report

**Phase Goal:** The companion script can load and validate agent config, execute any of the six local CLIs via the adapter strategy, persist workspace-scoped sessions, and log execution events correctly
**Verified:** 2026-04-04T05:52:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | A valid agents.json is parsed into typed AgentsConfig with per-adapter discriminated adapterConfig | VERIFIED | `schema.ts` exports `AgentsConfigSchema` with `z.discriminatedUnion`; 8 schema tests pass including `accepts adapterConfig for claude_local with model and maxBudgetUsd` |
| 2  | An invalid agents.json causes a human-readable error naming the failing field path | VERIFIED | `loader.ts` `loadConfig()` catches first Zod error, constructs `ConfigValidationError(fieldPath, issue.message)`; test `throws ConfigValidationError with field path for invalid config` passes |
| 3  | Companion finds .claude/agents.json by walking up from cwd | VERIFIED | `loader.ts` `findConfigPath()` uses `dirname()` loop; tests cover current-dir and parent-dir discovery |
| 4  | Missing CLAUDE_PLUGIN_DATA env var produces a descriptive error | VERIFIED | `validatePluginDataDir()` throws `PluginDataError` with message naming env var; test `throws PluginDataError when CLAUDE_PLUGIN_DATA is not set` passes |
| 5  | Child process execution enforces a configurable timeout and kills on exceed | VERIFIED | `runner.ts` uses `AbortController` + `setTimeout`; `AdapterTimeoutError` thrown on abort; `timeoutMs` option honored; 7 timeout tests pass (runner + 6 adapter shim tests) |
| 6  | Malformed JSON and JSONL input is handled without throwing unhandled exceptions | VERIFIED | `parse.ts` returns `null`/`[]` on parse failure; 9 parse tests pass |
| 7  | Session file is created at CLAUDE_PLUGIN_DATA/state/<sha256>/sessions/<agent-id>.json after first task | VERIFIED | `store.ts` `saveSession()` calls `getSessionPath()` which incorporates `workspaceHash()`; test `saveSession creates session file at correct path` passes |
| 8  | Session is loaded from disk when --resume flag is used | VERIFIED | `store.ts` `loadSession()` reads from `getSessionPath()`; `defaultHooks.loadSession` delegates to it; test `loadSession returns saved session data` passes |
| 9  | Session file is deleted when --fresh flag is used | VERIFIED | `store.ts` `deleteSession()` calls `unlinkSync`; test `deleteSession removes session file` passes |
| 10 | Sessions for different workspace roots are in separate hash-partitioned directories | VERIFIED | `paths.ts` `getSessionPath()` passes `workspaceRoot` through `workspaceHash()`; test `sessions for different workspace roots go to different hash directories` passes |
| 11 | Structured log entries are written with timestamp, level, job-id, message | VERIFIED | `logger.ts` `createLogger()` writes JSON `LogEntry` objects via `appendFileSync`; fields match `LogEntry` interface |
| 12 | Logger records durationMs on execution timing entries for adapter start/completion/failure (per LOG-02) | VERIFIED | `base.ts` `execute()` calls `logger?.info(message, durationMs)` on completion and `logger?.error(message)` on failure/timeout; `logger.ts` `info()` accepts optional `durationMs` |
| 13 | emitLog hook is called for each log entry | VERIFIED | `logger.ts` `write()` calls `emitLog(entry)` for every log write; test `emitLog is callable and does not throw` passes |
| 14 | Five hook interfaces are exported with sensible default implementations | VERIFIED | `defaults.ts` exports `defaultHooks` implementing all five `HookSet` members; 6 defaults tests pass |
| 15 | Each adapter invokes the correct CLI binary with proper flags for non-interactive mode | VERIFIED | All six adapters set `binaryName` and `buildArgs()`; shim tests verify round-trip against correct fixture output |
| 16 | Each adapter parses JSON/JSONL output from its CLI correctly | VERIFIED | Six adapter smoke tests verify `result.output` and `result.sessionId` against shim fixture values; all pass |
| 17 | Each adapter encodes session data for persistence and decodes it for resume | VERIFIED | All six adapters implement `encodeSession`/`decodeSession`; claude/codex return raw UUID; cursor/gemini/opencode/pi return raw session identifier string |
| 18 | Adapter process errors are caught and returned as typed errors without crashing | VERIFIED | `base.ts` catches non-zero exit and throws `AdapterProcessError`; each adapter smoke test `throws AdapterProcessError on non-zero exit` passes |
| 19 | Adapter timeout kills the child process and returns AdapterTimeoutError | VERIFIED | `runner.ts` `ABORT_ERR` handler rejects with `AdapterTimeoutError`; all six adapter shim timeout tests pass |
| 20 | BaseAdapter.execute() logs adapter start, completion with durationMs, and failure with durationMs (per LOG-02) | VERIFIED | `base.ts` lines 27, 56: `logger?.info(... started)`, `logger?.info(... completed, durationMs)`, `logger?.error(... failed/timed out after ${durationMs}ms)` |
| 21 | Runtime index.ts re-exports all public API | VERIFIED | `index.ts` re-exports types, config, adapters, process utilities, session, hooks, and logging |
| 22 | Each adapter has a smoke test using a fake CLI shim | VERIFIED | 6 adapter test files in `tests/adapters/`; all use `useShimPath()` which prepends `tests/fixtures/shims/` to PATH |
| 23 | All tests pass without any real CLI binaries installed | VERIFIED | 63 tests pass; shims replace all six CLI binaries |
| 24 | Full test suite passes green | VERIFIED | `vitest run`: 13 test files, 63 tests, 0 failures, duration 556ms |

**Score:** 24/24 truths verified

### Required Artifacts

| Artifact | Provided | Status | Details |
|----------|----------|--------|---------|
| `packages/runtime/vitest.config.ts` | Vitest configuration | VERIFIED | Exports `defineConfig`; `include: tests/**/*.test.ts`; `testTimeout: 15_000` |
| `packages/runtime/tsconfig.build.json` | Build-only tsconfig | VERIFIED | Extends base tsconfig; `rootDir: ./src`; `declaration: true`; `noEmit: false` |
| `packages/runtime/package.json` | Updated scripts | VERIFIED | `"build": "tsc --project tsconfig.build.json"`, `"test": "vitest run"` |
| `packages/runtime/src/types.ts` | All shared TypeScript types | VERIFIED | Exports `AdapterType`, `AgentConfig`, `AgentsConfig`, `AdapterResult`, `ExecuteOptions`, `ProcessResult`, `SessionData`, `LogEntry`, `HookSet` — all 9 types present |
| `packages/runtime/src/config/schema.ts` | Zod schemas | VERIFIED | Exports `AgentsConfigSchema`, `AgentSchema`, `AdapterConfigSchema` (discriminated union), `ADAPTER_TYPES` |
| `packages/runtime/src/config/loader.ts` | Config file discovery and loading | VERIFIED | Exports `findConfigPath`, `loadConfig`, `validatePluginDataDir`, `ConfigNotFoundError`, `ConfigValidationError`, `PluginDataError` |
| `packages/runtime/src/process/runner.ts` | Child process spawning with AbortController timeout | VERIFIED | Exports `spawnWithTimeout`, `AdapterTimeoutError`, `AdapterProcessError`; uses AbortController pattern |
| `packages/runtime/src/process/parse.ts` | Safe JSON/JSONL parsing | VERIFIED | Exports `parseJSON`, `parseJSONL`; never throw |
| `packages/runtime/src/session/hash.ts` | SHA-256 workspace hashing | VERIFIED | Exports `workspaceHash` using `node:crypto` |
| `packages/runtime/src/session/paths.ts` | Session and log path resolution | VERIFIED | Exports `getSessionPath`, `getLogPath`, `getStatePath` |
| `packages/runtime/src/session/store.ts` | Session CRUD | VERIFIED | Exports `loadSession`, `saveSession`, `deleteSession`; corrupt-file recovery implemented |
| `packages/runtime/src/logging/logger.ts` | Structured logger | VERIFIED | Exports `createLogger`, `Logger`; writes NDJSON; calls `emitLog` hook |
| `packages/runtime/src/hooks/defaults.ts` | Default hook implementations | VERIFIED | Exports `defaultHooks` satisfying all five `HookSet` members |
| `packages/runtime/src/adapters/base.ts` | Abstract BaseAdapter | VERIFIED | Exports `BaseAdapter`; 4 abstract methods; `execute()` template method with logging |
| `packages/runtime/src/adapters/claude-local.ts` | Claude CLI adapter | VERIFIED | Exports `ClaudeLocalAdapter`; `binaryName = 'claude'`; JSON output parsing |
| `packages/runtime/src/adapters/codex-local.ts` | Codex CLI adapter | VERIFIED | Exports `CodexLocalAdapter`; `binaryName = 'codex'`; JSONL output parsing |
| `packages/runtime/src/adapters/cursor.ts` | Cursor CLI adapter | VERIFIED | Exports `CursorAdapter`; `binaryName = 'cursor'`; JSON output parsing |
| `packages/runtime/src/adapters/gemini-local.ts` | Gemini CLI adapter | VERIFIED | Exports `GeminiLocalAdapter`; `binaryName = 'gemini'`; JSON output parsing |
| `packages/runtime/src/adapters/opencode-local.ts` | Opencode CLI adapter | VERIFIED | Exports `OpencodeLocalAdapter`; `binaryName = 'opencode'`; JSON output parsing |
| `packages/runtime/src/adapters/pi-local.ts` | Pi CLI adapter | VERIFIED | Exports `PiLocalAdapter`; `binaryName = 'pi'`; `--session` path/ID per research |
| `packages/runtime/src/index.ts` | Public re-exports | VERIFIED | Re-exports all types, config, adapters, process utilities, session, hooks, logging |
| `packages/runtime/tests/fixtures/shims/claude` (and 5 others) | Fake CLI shims | VERIFIED | All 6 shims present with `rwxr-xr-x` permissions; support `success`/`error`/`timeout` modes |
| `packages/runtime/tests/helpers/path-override.ts` | PATH override helper | VERIFIED | Exports `useShimPath()`; prepends shims dir to `process.env['PATH']` in `beforeEach` |
| `packages/runtime/tests/helpers/env-setup.ts` | Test env helper | VERIFIED | Exports `useTestPluginData()`; manages tmp dir and `CLAUDE_PLUGIN_DATA` env var |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `config/loader.ts` | `config/schema.ts` | `AgentsConfigSchema.safeParse` | WIRED | Line 52: `const result = AgentsConfigSchema.safeParse(raw)` |
| `process/runner.ts` | `types.ts` | returns `ProcessResult` | WIRED | Import `type { ProcessResult }` line 2; return type on `spawnWithTimeout` |
| `session/store.ts` | `session/paths.ts` | `getSessionPath` | WIRED | Line 3: `import { getSessionPath } from './paths.js'`; used in all three functions |
| `logging/logger.ts` | `types.ts` | `LogEntry` and `HookSet` | WIRED | Line 3: `import type { LogEntry, HookSet } from '../types.js'` |
| `hooks/defaults.ts` | `session/store.ts` | `loadSession`/`saveSession` | WIRED | Lines 2–3: imports both; calls in `loadSession` and `saveSession` hook members |
| `adapters/base.ts` | `process/runner.ts` | `spawnWithTimeout` | WIRED | Line 1: `import { spawnWithTimeout, ... }`; called on line 32 |
| `adapters/base.ts` | `logging/logger.ts` | `Logger` type | WIRED | Line 3: `import type { Logger }`; `logger?: Logger` parameter on `execute()` |
| `adapters/base.ts` | `types.ts` | `AdapterResult`, `ExecuteOptions`, `ProcessResult` | WIRED | Line 2: `import type { AdapterResult, ExecuteOptions, ProcessResult }` |
| `tests/helpers/path-override.ts` | `tests/fixtures/shims/` | prepends shims dir to PATH | WIRED | Line 5: `SHIMS_DIR = resolve(__dirname, '..', 'fixtures', 'shims')`; line 18: prepended to `process.env['PATH']` |
| `tests/adapters/*.test.ts` | `tests/helpers/path-override.ts` | `import.*path-override` | WIRED | All 6 adapter test files import `{ useShimPath }` from `../helpers/path-override.js` |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces utilities, domain logic, and CLI adapters; there are no UI components or pages rendering dynamic data. All data flows are exercised by the vitest test suite with live file I/O (session store) and real child-process spawning (runner + adapter shim tests).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite passes | `cd packages/runtime && npx vitest run` | 13 test files, 63 tests, 0 failures | PASS |
| TypeScript type-checks cleanly | `npx tsc --noEmit --project packages/runtime/tsconfig.json` | No output (exit 0) | PASS |
| tsconfig.build.json scoped to src only | `tsconfig.build.json include: ["src/**/*.ts"]` | Verified in file | PASS |
| Shim files have execute bit | `ls -la tests/fixtures/shims/` | All 6 files: `-rwxr-xr-x` | PASS |
| index.ts re-exports all public API | `packages/runtime/src/index.ts` line count + exports | 26 export lines covering all modules | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TEST-01 | 02-00, 02-01, 02-04 | Unit tests cover all runtime helpers without real CLI binaries | SATISFIED | 63 tests pass: schema (8), loader (7), runner (5), parse (9), session/store (7), hooks/defaults (6), smoke (1), 6 adapter shims (3 each = 18) |
| CONF-01 | 02-01 | agents.json schema defines defaultAgent and agents[] with required fields | SATISFIED | `schema.ts` `AgentsConfigSchema` + `AgentSchema` with `id`, `label`, `description`, `adapterType`, optional `adapterConfig` |
| CONF-02 | 02-01 | Companion validates agents.json and exits with human-readable error naming failing field path | SATISFIED | `loader.ts` `loadConfig()` throws `ConfigValidationError(fieldPath, message)`; test verifies field path in error |
| CONF-03 | 02-01 | adapterType restricted to exactly 6 values | SATISFIED | `schema.ts` `ADAPTER_TYPES` const tuple + `z.enum(ADAPTER_TYPES)` in `AgentSchema` |
| CONF-04 | 02-01 | Companion locates workspace root by walking up to find .claude/agents.json | SATISFIED | `loader.ts` `findConfigPath()` walks up via `dirname()` loop |
| ADPT-02 | 02-02 | Runtime exports five plugin-owned hook interfaces | SATISFIED | `types.ts` `HookSet` interface; `defaults.ts` `defaultHooks` implementing all five |
| ADPT-03 | 02-03 | claude_local adapter invokes claude CLI, encodes/decodes session, parses stdout | SATISFIED | `claude-local.ts` + shim test verifies `output='Hello from claude'`, `sessionId='test-session-123'` |
| ADPT-04 | 02-03 | codex_local adapter invokes codex CLI, encodes/decodes session, parses JSONL stdout | SATISFIED | `codex-local.ts` uses `parseJSONL`; shim test verifies output + sessionId |
| ADPT-05 | 02-03 | cursor adapter invokes Cursor CLI, encodes/decodes session, parses stdout | SATISFIED | `cursor.ts` + shim test passes |
| ADPT-06 | 02-03 | gemini_local adapter invokes gemini CLI, encodes/decodes session, parses stdout | SATISFIED | `gemini-local.ts` + shim test passes |
| ADPT-07 | 02-03 | opencode_local adapter invokes opencode CLI, encodes/decodes session, parses stdout | SATISFIED | `opencode-local.ts` + shim test passes |
| ADPT-08 | 02-03 | pi_local adapter invokes Pi CLI, encodes/decodes session, parses stdout | SATISFIED | `pi-local.ts` uses `--session path/ID` per research; shim test passes |
| ADPT-09 | 02-01 | Child-process runner enforces configurable timeout and kills process | SATISFIED | `runner.ts` `AbortController` + `setTimeout`; `AdapterTimeoutError` on abort |
| ADPT-10 | 02-01 | Runtime exports JSON/JSONL parsers that handle malformed input without throwing | SATISFIED | `parse.ts` returns `null`/`[]` on error; 9 parse tests confirm never-throw contract |
| SESS-01 | 02-02 | Session file created at CLAUDE_PLUGIN_DATA/state/<sha256>/sessions/<agent-id> | SATISFIED | `paths.ts` `getSessionPath()` + `store.ts` `saveSession()` creates dirs and writes file |
| SESS-02 | 02-02 | Session loaded from disk when --resume flag used | SATISFIED | `store.ts` `loadSession()` reads from disk; `defaultHooks.loadSession` delegates to it |
| SESS-03 | 02-02 | Session deleted when --fresh flag used | SATISFIED | `store.ts` `deleteSession()` removes file; test confirms no-op when missing |
| SESS-04 | 02-02 | Sessions for different workspace roots in separate hash-partitioned directories | SATISFIED | `hash.ts` `workspaceHash()` SHA-256; test confirms different roots produce different paths |
| ERR-03 | 02-01, 02-03, 02-04 | Companion catches adapter process errors without crashing | SATISFIED | `base.ts` catches spawn errors and wraps in `AdapterProcessError`; non-zero exit also throws `AdapterProcessError`; all six adapter error shim tests pass |
| ERR-05 | 02-01 | Descriptive error when CLAUDE_PLUGIN_DATA not set or not writable | SATISFIED | `loader.ts` `validatePluginDataDir()` throws `PluginDataError` with specific message for both conditions |
| LOG-01 | 02-02 | Structured log entries with timestamp, level, job-id, message written to log file | SATISFIED | `logger.ts` `createLogger()` writes JSON `LogEntry` via `appendFileSync` |
| LOG-02 | 02-02, 02-03 | Adapter execution start, completion, and failure logged with timing | SATISFIED | `base.ts` `execute()`: logs start (no durationMs), completion with `durationMs`, failure/timeout with `durationMs` |
| LOG-03 | 02-02 | emitLog hook called for each log entry | SATISFIED | `logger.ts` `write()` always calls `emitLog(entry)` after file append |
| TEST-02 | 02-04 | Each of six adapters has smoke test using fake CLI shim | SATISFIED | 6 test files in `tests/adapters/`; each has 3 test cases (success, error, timeout); all 18 tests pass |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No anti-patterns detected. All modules use proper typed errors, no `process.exit()` in runtime code, no raw `JSON.parse` in adapters (all use `parseJSON`/`parseJSONL`), no hardcoded empty state passed to rendering. The `emitLog: () => {}` no-op in `defaults.ts` is intentional and documented.

### Human Verification Required

None. All phase behaviors are fully verifiable via static analysis and the automated test suite.

### Gaps Summary

No gaps. All 24 observable truths are verified, all artifacts exist and are substantive and wired, all key links are confirmed, and all 24 requirement IDs are satisfied. The full test suite (63 tests across 13 files) passes without any real AI CLI binaries installed.

---

_Verified: 2026-04-04T05:52:00Z_
_Verifier: Claude (gsd-verifier)_
