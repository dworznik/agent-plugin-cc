# Project Research Summary

**Project:** Standalone Universal Agents Plugin for Claude Code
**Domain:** Claude Code plugin / Node.js CLI orchestration runtime
**Researched:** 2026-04-04
**Confidence:** HIGH

## Executive Summary

This is a Claude Code slash-command plugin that orchestrates local AI agent CLIs (claude, codex, gemini, opencode, cursor, pi) as background or foreground tasks from within a Claude Code session. The pattern is well-established — `codex-plugin-cc` proves the approach works — and this project extends it to support six adapter types with a multi-agent config system, persistent sessions, and disk-based job state that survives Claude context resets. The implementation is pure Node.js/TypeScript with a minimal dependency surface: only `zod` is a runtime dependency, everything else is dev tooling.

The recommended approach is a clean two-package architecture: a publishable `agents-runtime` package that contains all adapter logic (strategy pattern, session codecs, output parsers), and a companion script bundled to a single `.cjs` file that orchestrates execution. The plugin layer is just Markdown prompt files and JSON manifests conforming to the Claude Code plugin spec. This separation enforces the zero-Paperclip-dependency guarantee at the `package.json` boundary and keeps each layer independently testable.

The dominant risk is Paperclip dependency creep — monorepo convenience imports silently breaking the standalone guarantee. The second risk is process orphaning on cancel (worker exits but AI CLI subprocess keeps running). Both must be addressed in the first two implementation phases before any feature work builds on top of them. Everything else — session management, adapter parsers, UX — is well-understood engineering with known solutions.

## Key Findings

### Recommended Stack

The stack is tightly constrained by the project context. Node.js 20 LTS provides all primitives needed (`child_process`, `fs/promises`, `crypto`, `readline`) without external dependencies. TypeScript 5.4+ is mandated and provides the compile-time enforcement of adapter contract boundaries that runtime checks alone cannot. `zod` v3 is the single runtime dependency — it serves as both schema validator and TypeScript type source for `ConfiguredAgent`, `JobRecord`, and `SessionData` shapes.

For tooling: `vitest` 2.x for tests (TypeScript-native, no ts-jest overhead), `tsup` 8.x to bundle the companion script to a single `.cjs` executable, and `tsc` for the runtime package (clean `.d.ts` declarations, no bundling). The key constraint is CJS output — use `"module": "Node16"` in tsconfig to catch ESM/CJS boundary issues at compile time rather than runtime.

**Core technologies:**
- **Node.js 20 LTS**: Runtime — all needed built-ins, stable LTS
- **TypeScript 5.4+**: Language — compile-time adapter contract enforcement
- **zod 3.x**: Schema + types — single source of truth for all domain shapes
- **vitest 2.x**: Tests — TypeScript-native, fast, no shim layer needed
- **tsup 8.x**: Companion bundler — single `.cjs` output with shebang

**What NOT to use:** `find-up` v7+ (ESM-only), `jest` (ts-jest overhead), `dotenv` (state is in `CLAUDE_PLUGIN_DATA`, not `.env`), `@anthropic-ai/sdk` (this plugin invokes CLIs via child processes, not the API directly), `winston`/`pino` (JSONL log appends via `fs.appendFile` are sufficient).

### Expected Features

All P1 features must ship in v1 to deliver the core value proposition: "run any configured local agent as a background or foreground job from Claude Code, with state that survives context resets."

**Must have (table stakes):**
- `/agents:setup` interactive wizard — writes `.claude/agents.json` with JSON Schema validation; `.gitignore`d by default to protect API keys
- `/agents:list` — display configured agents with id, label, description, adapter type, session age
- `/agents:task` (foreground + background) — the core action; foreground for short tasks, background for long ones
- `/agents:status <job-id>` — polls job state from disk; works after context resets
- `/agents:result <job-id>` — reads result file and returns output to Claude session
- `/agents:cancel <job-id>` — kills entire process group, not just the worker PID
- Six adapters: `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`
- Persistent sessions per `(workspace, agent-id)` with `--fresh`/`--resume` flags
- Plugin layout conforming to Claude Code spec (`marketplace.json`, `plugin.json`, command/agent prompts)

**Should have (competitive):**
- Thin delegation subagent — natural-language task routing without manual `--agent` selection
- CI-safe fixture tests — no real AI CLI binaries required in test suite
- Workspace-hashed state isolation — `sha256(workspaceRoot)[:8]` prefix prevents cross-repo collisions
- Human-readable job IDs — `{agentId}-{timestamp}` slug instead of bare UUID

**Defer (v2+):**
- MCP tools interface — slash commands ship first; MCP adds protocol complexity without new value
- Remote/HTTP adapters — auth, rate-limiting, retry logic triples v1 surface area
- Cross-workspace session sharing — session contamination problem unsolved; defer until isolation semantics are proven

### Architecture Approach

The architecture is a clean three-layer system: Claude Code slash commands (stateless Markdown prompts) → companion script (state authority, config loader, session manager, job dispatcher) → adapter runtime package (pure execution primitives per CLI). The companion script and all slash commands delegate to a delegation subagent that picks the best agent by description match, then invokes one companion command. All state (jobs, sessions, results) lives on disk under `CLAUDE_PLUGIN_DATA/state/<workspace-hash>/`, never in Claude's context window.

**Major components:**
1. **Slash Commands** (`.claude-plugin/commands/*.md`) — stateless entry points; parse args, delegate to companion
2. **Delegation Subagent** (`.claude-plugin/agents/delegate.md`) — reads `agents.json`, scores agent match, invokes one companion command
3. **Companion Script** (`scripts/companion.js`) — state authority; config load/validate, session read/write, job lifecycle, adapter dispatch
4. **Adapter Runtime** (`packages/agents-runtime/`) — strategy pattern; one module per adapter with `buildCommand`, `parseOutput`, `encodeSession`, `decodeSession`
5. **Worker Process** (`scripts/worker.js`) — detached child for background jobs; writes state to disk, no IPC back to companion

Key patterns: Strategy Pattern for adapters (new adapter = new module, zero existing code changes), Disk-as-Source-of-Truth for all job state, atomic writes via `rename()` to prevent corruption, workspace-scoped session keys to prevent cross-repo bleed.

### Critical Pitfalls

1. **Paperclip dependency creep via transitive imports** — enforce `no-restricted-imports` ESLint rule banning `paperclip-*` in `agents-runtime`; verify with `npm pack` + `grep -r "paperclip" dist/` in CI on every build
2. **Orphan processes after cancel** — kill entire process group with `process.kill(-pgid, 'SIGTERM')`, not just the worker PID; write a cancel smoke test that checks `ps aux` for lingering CLI subprocesses
3. **State file corruption from non-atomic writes** — always write to `.tmp` then `fs.renameSync` to target; wrap all `JSON.parse` reads in try/catch and treat parse failures as "state unknown, retry"
4. **Session file corruption on mid-write crash** — same atomic write pattern; `loadSession` must treat ALL errors (not just `ENOENT`) as "no session" and recover gracefully without user intervention
5. **Plugin layout non-conformance causes silent load failure** — write a layout test that validates all required files, JSON schemas, and path references in `plugin.json` before any feature work

## Implications for Roadmap

Based on the dependency chain and pitfall-to-phase mapping from research, the correct build order is: establish the package boundary first, then the plugin skeleton, then the execution core, then adapters, then the full command surface. Never build features on top of an unverified package boundary.

### Phase 1: Repository Scaffolding & Plugin Skeleton

**Rationale:** Establishes the package boundary that prevents Paperclip dependency creep — the highest-severity pitfall. All other phases build on this foundation. Layout conformance must be verified before any feature code is written.
**Delivers:** Repo structure with `packages/agents-runtime/`, `scripts/`, `.claude-plugin/` per spec; `tsconfig`, `vitest`, `tsup` configured; plugin layout test passing; `npm pack` clean of Paperclip references
**Addresses:** Plugin layout conformance (table stakes), CI-safe fixture tests (differentiator)
**Avoids:** Pitfall 1 (Paperclip creep), Pitfall 7 (layout non-conformance)
**Research flag:** Skip — standard patterns; repo setup and layout conformance are well-documented

### Phase 2: Companion Core — Config, State & Session Infrastructure

**Rationale:** The companion script is the foundation all commands depend on. Config loading, job state management, and session persistence must exist and be correct before any command can function. Atomic writes and `CLAUDE_PLUGIN_DATA` assertion belong here.
**Delivers:** Config loader (zod schema, `agents.json` validation), job state manager (atomic writes, CRUD), session manager (workspace-scoped keys, corrupt-file recovery), `CLAUDE_PLUGIN_DATA` guard at startup
**Addresses:** Persistent sessions, background job state, JSON Schema validation of `agents.json`
**Avoids:** Pitfall 3 (state file race conditions), Pitfall 4 (session corruption), Pitfall 6 (missing env var silent failure)
**Research flag:** Skip — Node.js `fs.promises`, atomic rename, `sha256` hashing are standard patterns

### Phase 3: Adapter Runtime — Strategy Interface + Core Adapters

**Rationale:** The adapter strategy interface is the extensibility seam for all six adapters. Define the interface once (`buildCommand`, `parseOutput`, `encodeSession`, `decodeSession`), then implement the two highest-priority adapters (`claude_local`, `codex_local`). Remaining four adapters follow the same pattern and can ship in a subsequent phase.
**Delivers:** `AdapterStrategy` interface, `runner.ts` child-process wrapper, `parse.ts` output parsers, `claude_local` and `codex_local` adapters with fixture-based smoke tests covering two output format variants each
**Addresses:** Core adapter coverage, CI-safe fixture tests
**Avoids:** Pitfall 5 (parser tied to specific CLI version)
**Research flag:** Needs research — each CLI's actual output format and flag API requires verification against real binaries or current docs before implementing parsers

### Phase 4: Remaining Adapters — Gemini, OpenCode, Cursor, Pi

**Rationale:** Same adapter pattern, but `gemini_local` has a buffered JSONL parsing gotcha (partial line flushing), `cursor` has a GUI-context dependency that requires headless mode verification, and `opencode_local` must not share flag config with `codex_local` despite similar names.
**Delivers:** `gemini_local`, `opencode_local`, `cursor`, `pi_local` adapters with fixture smoke tests; headless mode confirmed for cursor
**Addresses:** Six adapter types (differentiator)
**Avoids:** Integration gotchas for each adapter (see PITFALLS.md integration gotchas table)
**Research flag:** Needs research — `cursor` headless mode and `gemini_local` JSONL buffer behavior should be verified before implementation

### Phase 5: Background Job Execution — Worker Process & Cancel

**Rationale:** Background jobs are the high-complexity core of the product. The detached worker pattern, process group management on cancel, and human-readable job IDs all need careful implementation. Build this after adapters work correctly so the worker can delegate to a tested adapter.
**Delivers:** `scripts/worker.js` detached worker, `spawn({ detached: true })` with process group tracking, `/agents:cancel` with full process tree kill and 5-second confirmation poll, human-readable job ID format
**Addresses:** Background mode, `/agents:cancel`, job state persistence
**Avoids:** Pitfall 2 (orphan processes), UX pitfall (cancel returns before confirming death)
**Research flag:** Skip — Node.js detached spawn and process group kill are well-documented patterns

### Phase 6: Slash Commands & Delegation Subagent

**Rationale:** With companion infrastructure and adapters solid, the command surface is straightforward prompt authoring. The delegation subagent is a thin layer — reads `agents.json`, scores description match, invokes one companion command.
**Delivers:** All six command prompt files (`setup.md`, `list.md`, `task.md`, `status.md`, `result.md`, `cancel.md`), delegation subagent, foreground progress feedback, interactive `/agents:setup` wizard with `.gitignore` creation
**Addresses:** All table-stakes features, delegation subagent differentiator
**Avoids:** UX pitfalls (no feedback during foreground, UUID-only job IDs, manual JSON editing in setup)
**Research flag:** Skip — slash command prompt authoring follows `codex-plugin-cc` reference patterns

### Phase 7: Integration Testing & Hardening

**Rationale:** End-to-end verification that the full system — slash command → delegation subagent → companion → adapter → worker — works correctly. This phase adds companion integration tests, the full "looks done but isn't" checklist verification, and security hardening (file permissions, command injection prevention).
**Delivers:** Companion integration tests (config → session → job lifecycle), cancel smoke test (`ps aux` verification), `npm pack` CI check, file mode `0o600` on all state files, `shell: false` enforcement on all spawns
**Addresses:** CI-safe tests, security hardening
**Avoids:** All security mistakes in PITFALLS.md (API key exposure, command injection, world-readable state)
**Research flag:** Skip — standard integration test and security hardening patterns

### Phase Ordering Rationale

- **Package boundary before everything:** Pitfall 1 (Paperclip creep) is the highest-severity risk. If the boundary is wrong, every subsequent phase builds on a broken foundation that's expensive to fix post-release.
- **Infrastructure before commands:** `/agents:task` depends on `agents.json` validation, job state, and session persistence. No command can be implemented correctly before Phase 2 delivers these.
- **Two adapters before six:** Phases 3 and 4 split adapter work because the `AdapterStrategy` interface must be validated with real implementations before applying it to all six. Getting two right proves the pattern.
- **Worker after adapters:** The background worker calls an adapter. The adapter must be independently testable before the worker adds another layer.
- **Commands last among features:** Commands are thin prompt files. Writing them last means the companion infrastructure they delegate to is already tested and correct.

### Research Flags

**Needs deeper research during planning:**
- **Phase 3 / Phase 4 (Adapters):** Each CLI's current output format, flag API, and session mechanism requires verification. CLI tools in this domain (claude, gemini, opencode) iterate rapidly; parsers written against stale docs will fail silently. Use `/gsd:research-phase` before planning adapter phases.
- **Phase 4 specifically (cursor):** Headless mode support is unconfirmed. If cursor requires a GUI context, it may need to be deferred or implemented differently.

**Standard patterns — skip research-phase:**
- **Phase 1** (repo scaffolding, tsconfig, vitest setup) — well-documented
- **Phase 2** (Node.js fs, atomic writes, zod validation) — well-documented
- **Phase 5** (detached spawn, process groups) — official Node.js docs cover this
- **Phase 6** (slash command prompt authoring) — `codex-plugin-cc` reference covers this
- **Phase 7** (integration tests, security hardening) — standard patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Stack is constrained by project context; all choices are well-established in the Node.js/TypeScript ecosystem; only vitest v2 Node minimum needs verification |
| Features | HIGH | Requirements are well-specified in PROJECT.md; `codex-plugin-cc` reference validates the command surface pattern |
| Architecture | HIGH | Derived directly from project requirements and reference implementation; strategy pattern and disk-as-truth are proven patterns in this domain |
| Pitfalls | HIGH | Domain pitfalls derived from direct code analysis and known Node.js child_process/file I/O behavior; POSIX rename atomicity is a well-understood guarantee |

**Overall confidence:** HIGH

### Gaps to Address

- **Adapter output formats:** The exact current output format and available flags for each AI CLI (`claude`, `gemini`, `opencode`, `cursor`, `pi`) must be verified before implementing parsers. This is the biggest unknown — these tools change frequently. Address during Phase 3/4 planning with `/gsd:research-phase`.
- **Cursor headless mode:** Whether `cursor` supports headless invocation without a GUI context is unverified. If not supported, the `cursor` adapter may need to be deferred to v2 or replaced with a different approach.
- **vitest@2 Node minimum:** Research states Node 18+ required — verify the exact minimum before locking `package.json` engines field. Node 20 satisfies this, but the exact constraint should be confirmed.
- **Claude Code plugin spec completeness:** The `marketplace.json` and `plugin.json` required fields are inferred from `codex-plugin-cc` rather than official documentation. The layout test in Phase 1 should be validated against a real Claude Code plugin load before Phase 6 ships commands.

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` — project requirements and design decisions (authoritative)
- `codex-plugin-cc` reference implementation — command surface, companion pattern, plugin layout baseline
- Node.js 20 LTS docs — `child_process`, `fs/promises`, detached spawn, process group kill

### Secondary (MEDIUM confidence)
- Claude Code plugin spec — inferred from `codex-plugin-cc` layout and project constraints; not verified against official docs
- vitest v2 changelog — Node 18+ minimum; cross-referenced with release notes pattern

### Tertiary (LOW confidence — verify during adapter phases)
- Per-CLI output formats (claude, gemini, opencode, cursor, pi) — training data; likely stale; must verify against current CLI versions before implementing parsers
- cursor headless mode support — unverified; may require GUI context

---
*Research completed: 2026-04-04*
*Ready for roadmap: yes*
