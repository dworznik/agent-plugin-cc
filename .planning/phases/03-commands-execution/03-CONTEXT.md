# Phase 3: Commands & Execution - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

A developer can configure agents with `/agents:setup`, dispatch tasks in foreground and background, track jobs, retrieve results, cancel running jobs, and have the delegation subagent auto-select the right agent — all with correct error handling. This phase wires up the full command surface on top of the Phase 2 runtime core.

</domain>

<decisions>
## Implementation Decisions

### Companion CLI Design
- **D-01:** Hand-rolled argv parser — no CLI framework dependency. Subcommand as `argv[2]`, flags via simple loop. Sufficient for 6 commands with a few flags each. Matches zero-dep philosophy.
- **D-02:** Single entry point with subcommand pattern: `companion setup`, `companion task --agent x`, `companion status <id>`. One file bundled with tsup. Matches the current stub in `packages/plugin/src/companion/index.ts`.
- **D-03:** Missing config guard — non-setup commands fail with: "No agents.json found. Run /agents:setup to configure agents." Clear, actionable, satisfies ERR-01/ERR-02.

### Background Job Architecture
- **D-04:** Background jobs spawned via `child_process.fork()` with detached mode, `stdio: 'ignore'`, and `unref()`. Parent writes initial job metadata and exits immediately. Proven Node daemon pattern.
- **D-05:** Separate worker entry point (`worker.ts`) bundled by tsup alongside the companion. Takes job-id + config as args, runs the adapter, writes result. Clean separation from companion logic.
- **D-06:** Cancel sentinel polled every 1 second by the worker during adapter execution. On detection, worker kills the child process and writes `cancelled` status. Simple and reliable.

### Command File Content
- **D-07:** Command `.md` files instruct Claude to run `node .claude-plugin/scripts/agents-companion.cjs <subcommand> [flags]` via Bash tool and parse the structured output. Direct and explicit invocation.
- **D-08:** `/agents:setup` is a guided interactive wizard — the command `.md` instructs Claude to ask the user for agent details (id, label, adapter type, description) conversationally, then calls the companion to write `agents.json`.
- **D-09:** Companion always outputs JSON. Command `.md` files tell Claude to parse JSON and present results in human-readable format (tables, lists). Consistent, testable, and flexible for Claude to reformat.

### Delegation Subagent
- **D-10:** Claude IS the matcher — subagent `.md` file lists all agent descriptions (fetched via companion) and instructs Claude to select the best match using its own judgment. No scoring algorithm needed.
- **D-11:** When no agent clearly matches, subagent shows all agents with descriptions and asks the user to pick. Satisfies DELEG-03. Transparent, avoids wrong guesses.
- **D-12:** Subagent calls `companion list --json` to get agents rather than reading `agents.json` directly. Single source of truth — companion handles config loading, validation, formatting.

### Claude's Discretion
- Job ID generation format (UUID or similar)
- Exact JSON output schemas for each command
- Command `.md` frontmatter fields and formatting conventions
- Worker script error recovery details
- Companion exit codes for different failure modes
- Exact flag names beyond those specified in requirements (e.g., `--json` for list)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` — Vision, constraints, key decisions, adapter list, out-of-scope items
- `.planning/REQUIREMENTS.md` — CONF-05, CONF-06, CMD-01 through CMD-13, JOB-01 through JOB-07, DELEG-01 through DELEG-03, ERR-01, ERR-02, ERR-04, TEST-03, TEST-05 (Phase 3 requirements)
- `.planning/ROADMAP.md` — Phase 3 success criteria and scope boundary

### Prior Phase Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Foundation decisions (monorepo structure, build tooling, lint config)
- `.planning/phases/02-runtime-core/02-CONTEXT.md` — Runtime core decisions (adapter strategy, config schema, session persistence, hooks)

### Existing Code
- `packages/plugin/src/companion/index.ts` — Companion stub (Phase 3 replaces with real CLI)
- `packages/runtime/src/index.ts` — Runtime package exports (adapters, config, sessions, hooks, logger)
- `packages/plugin/.claude-plugin/plugin.json` — Plugin manifest declaring commands and agents directories
- `packages/plugin/.claude-plugin/marketplace.json` — Plugin marketplace metadata

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/runtime` exports everything needed: `loadConfig`, `findConfigPath`, `BaseAdapter` + 6 adapter subclasses, `loadSession`/`saveSession`/`deleteSession`, `workspaceHash`, `getSessionPath`/`getLogPath`/`getStatePath`, `createLogger`, `defaultHooks`, `spawnWithTimeout`
- Config validation with `ConfigNotFoundError` and `ConfigValidationError` (carries `fieldPath`) — ready for companion error reporting
- Session store with `loadSession`/`saveSession`/`deleteSession` — ready for `--fresh`/`--resume` flags
- `parseJSON`/`parseJSONL` utilities for output parsing

### Established Patterns
- Abstract `BaseAdapter` with per-adapter `execute()`, `parseOutput()`, `encodeSession()`, `decodeSession()` — companion just instantiates the right adapter
- `zod` schemas for config validation — same pattern can extend to job metadata validation
- Structured logging via `createLogger` with `durationMs` on `info()` — ready for job lifecycle events
- Fake CLI shims using `__ADAPTER_TEST_MODE` env var — same pattern for companion integration tests

### Integration Points
- Companion imports from `@agent-plugin-cc/runtime` (workspace dependency)
- `tsup` bundles companion to `.cjs` — worker entry point needs its own tsup entry
- `.claude-plugin/commands/` and `.claude-plugin/agents/` directories need to be created with real content
- `.claude-plugin/scripts/` needs the bundled companion + worker scripts

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-commands-execution*
*Context gathered: 2026-04-04*
