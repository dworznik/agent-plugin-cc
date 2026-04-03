# Phase 2: Runtime Core - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

The companion script can load and validate agent config, execute any of the six local CLIs via the adapter strategy, persist workspace-scoped sessions, and log execution events correctly. No commands surface (Phase 3), no background jobs (Phase 3), no setup wizard (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Adapter Strategy Pattern
- **D-01:** All adapter code lives in `packages/runtime` (the publishable package). Plugin companion imports adapters from runtime. Runtime is self-contained and reusable outside the plugin.
- **D-02:** Abstract `BaseAdapter` class with per-adapter overrides. Each adapter implements `execute()`, `parseOutput()`, `encodeSession()`, `decodeSession()`. Common timeout/kill logic lives in the base class.
- **D-03:** The five hook interfaces (`buildAgentEnv`, `resolveInstructions`, `loadSession`, `saveSession`, `emitLog`) ship with sensible default implementations. Companion can override any hook at initialization.

### Config Schema Design
- **D-04:** `adapterConfig` is a discriminated union keyed by `adapterType`. Each adapter type defines its own zod schema (e.g., `claude_local` allows `model`, `codex_local` allows `provider`). Validated per-adapter at load time.
- **D-05:** Unknown fields in `agents.json` are stripped silently (zod `.strip()` mode). Forward-compatible: users can add custom metadata without breaking validation.
- **D-06:** Companion locates config by walking up from cwd to find `.claude/agents.json`. Standard workspace-root discovery matching Claude Code conventions. Fails with clear error if not found.

### Session Persistence Model
- **D-07:** Sessions are stored as JSON with adapter-specific shape. Each adapter defines its own session schema. Human-readable and easy to debug.
- **D-08:** State directory uses SHA-256 of absolute workspace root: `CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>/sessions/<agent-id>.json`. Deterministic, no collisions.
- **D-09:** Corrupt session files trigger a warning log + fresh start. The bad session file is deleted and execution continues as if `--fresh`. No abort, no complex repair.

### Fake CLI Test Fixtures
- **D-10:** Fake CLI shims are simple shell scripts that echo fixture output. Tests set PATH to include the fixture directory. Minimal and easy to maintain.
- **D-11:** CLI output formats will be researched during plan-phase (`/gsd:research-phase`) to verify current formats before implementation. Fixtures will be based on verified formats, not assumptions. This addresses the STATE.md blocker about stale training data.
- **D-12:** Each adapter smoke test covers three scenarios: successful output parsing, timeout kill, and non-zero exit code error. Covers critical paths without being exhaustive.

### Pre-existing Decisions (from Phase 1)
- **D-13:** Monorepo with npm workspaces: `packages/runtime` (publishable adapter core) and `packages/plugin` (companion + Claude Code plugin package)
- **D-14:** `zod` v3 is the single runtime dependency — schema + TypeScript types from one source
- **D-15:** `tsup` bundles companion to single `.cjs` file; `tsc` for runtime package type declarations
- **D-16:** Paperclip boundary enforced by ESLint `no-restricted-imports` + `npm pack` CI check

### Claude's Discretion
- Internal naming conventions for adapter files (e.g., `adapters/claude-local.ts` vs `adapters/claudeLocal.ts`)
- Exact zod schema field names for each adapter's `adapterConfig`
- Log entry format details beyond the structured fields (timestamp, level, job-id, message)
- Child-process spawning implementation details (spawn vs exec, stdio config)
- Workspace root walk-up algorithm implementation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documentation
- `.planning/PROJECT.md` -- Vision, constraints, key decisions, adapter list, out-of-scope items
- `.planning/REQUIREMENTS.md` -- CONF-01 through CONF-04, ADPT-02 through ADPT-10, SESS-01 through SESS-04, ERR-03, ERR-05, LOG-01 through LOG-03, TEST-01, TEST-02 (Phase 2 requirements)
- `.planning/ROADMAP.md` -- Phase 2 success criteria and scope boundary

### Phase 1 Context
- `.planning/phases/01-foundation/01-CONTEXT.md` -- Foundation decisions (monorepo structure, build tooling, lint config)

### Existing Code
- `packages/runtime/src/index.ts` -- Runtime package entry point (currently stub)
- `packages/plugin/src/companion/index.ts` -- Companion script entry point (currently stub)
- `packages/runtime/package.json` -- Runtime package config (zod dependency, build script, exports)
- `packages/plugin/package.json` -- Plugin package config (tsup, vitest)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/runtime` package structure is ready -- has zod dependency, tsc build, proper exports config
- `packages/plugin` has tsup build and vitest configured from Phase 1
- Layout conformance test (`packages/plugin/tests/layout.test.ts`) provides a pattern for structural tests

### Established Patterns
- Monorepo workspace boundaries enforce Paperclip isolation at the package level
- tsup bundles companion to `.cjs`; tsc generates `.d.ts` for runtime
- vitest is the test runner with existing config in plugin package

### Integration Points
- Companion (`packages/plugin/src/companion/index.ts`) will import adapter classes from `@agent-plugin-cc/runtime`
- Runtime package exports will expand from empty stub to adapter classes, config schema, session utils, hooks
- Config loader needs to integrate with the workspace-root walk-up to find `.claude/agents.json`
- Session persistence writes to `CLAUDE_PLUGIN_DATA/state/` (env var from Claude Code host)

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

- `cursor` headless mode is unconfirmed (from STATE.md). If headless mode doesn't work, cursor adapter may need to be deferred to v2. Research phase should verify this.
- Remote/webhook adapters (`http`, `process`, `openclaw_gateway`) are v2 scope per PROJECT.md.

</deferred>

---

*Phase: 02-runtime-core*
*Context gathered: 2026-04-04*
