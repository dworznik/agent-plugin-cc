# Standalone Universal Agents Plugin for Claude Code

## What This Is

A standalone Claude Code plugin that invokes configured local AI agents (Claude, Codex, Cursor, Gemini, etc.) from inside a Claude session — no Paperclip server, database, or installation required. It ships its own repo-local agent config at `.claude/agents.json`, a Node companion runtime, and a `/agents:*` slash command surface with background job support and persistent per-agent sessions. Built for developers who want to orchestrate multiple local AI CLI agents from within Claude Code without any Paperclip dependency.

## Core Value

A developer can run any configured local agent as a background job from Claude Code, track it, and retrieve its output — with zero Paperclip infrastructure.

## Requirements

### Validated

- [x] Claude Code plugin package with standard layout: `.claude-plugin/marketplace.json`, `plugin.json`, `commands/`, `agents/`, `scripts/` — Validated in Phase 1: Foundation
- [x] Plugin layout tests verify all required files are present at correct paths — Validated in Phase 1: Foundation
- [x] No Paperclip dependency enforced at package boundary via ESLint `no-restricted-imports` — Validated in Phase 1: Foundation
- [x] Extract a Paperclip-free adapter runtime package with only neutral execution primitives (types, session codecs, prompt helpers, child-process runner, JSON/JSONL parsing, timeout handling, per-adapter execute/test/parse/session code) — Validated in Phase 2: Runtime Core
- [x] Plugin-owned hooks replace Paperclip control-plane: `buildAgentEnv`, `resolveInstructions`, `loadSession`, `saveSession`, `emitLog` — Validated in Phase 2: Runtime Core
- [x] Support exactly six local CLI adapters in v1: `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local` — Validated in Phase 2: Runtime Core
- [x] Standalone agent config at `.claude/agents.json` with JSON Schema validation (fields: `defaultAgent`, `agents[]` with `id`, `label`, `description`, `adapterType`, `adapterConfig`) — Validated in Phase 2: Runtime Core
- [x] Plugin-local runtime state persisted under `CLAUDE_PLUGIN_DATA/state/<workspace-hash>/` (sessions, job metadata, logs, results, cancel bookkeeping) — Validated in Phase 2: Runtime Core
- [x] One persistent session per `(workspace root, agent id)`; `--fresh` discards, `--resume` reuses — Validated in Phase 2: Runtime Core

### Active
- [ ] Claude Code plugin package with standard layout: `.claude-plugin/marketplace.json`, `plugin.json`, `commands/`, `agents/`, `scripts/`
- [ ] Six commands: `/agents:setup`, `/agents:list`, `/agents:task`, `/agents:status`, `/agents:result`, `/agents:cancel`
- [ ] One thin delegation subagent that selects the best agent by `description` and invokes exactly one companion command
- [ ] Node companion script: locates workspace root, loads/validates config, runs adapter, streams progress, persists background job state
- [ ] Foreground mode returns output directly; background mode spawns detached worker and records job id
- [ ] Companion is source of truth for status/result/cancel — not Claude memory
- [ ] Unit tests for runtime helpers; per-adapter smoke tests with fake CLIs; companion tests for config, session, job lifecycle; plugin layout tests
- [ ] CI relies on fixtures only — no real CLI binaries required

### Out of Scope

- Paperclip API, server, database, UI, or route changes — this plugin must work with zero Paperclip infrastructure; adding any dependency defeats the purpose
- `process`, `http`, `openclaw_gateway` adapters — remote/webhook adapters deferred to v2; v1 is local-CLI-only
- MCP tools-first UX — command-based slash commands ship first; MCP interface is a future enhancement
- `PAPERCLIP_*` env injection, skill discovery/sync, company/issue/workspace metadata contracts — these are Paperclip control-plane concerns explicitly excluded from the runtime core
- Cross-workspace session reuse — sessions are scoped to `(workspace root, agent id)` to avoid state pollution
- Paperclip namespace in user-facing UX — all commands use `/agents:*`, not `/paperclip:*`
- Real-CLI integration tests in CI — opt-in only; CI uses fixtures to avoid binary dependencies

## Context

- This plugin lives in the same repo as Paperclip but must not depend on it. The adapter execution code currently lives in `packages/adapter-utils` and local adapter `server/` exports — those neutral pieces are extracted into a new publishable runtime package.
- The UX model mirrors `codex-plugin-cc`: slash commands + one thin subagent + background jobs + persistent sessions. That reference implementation is the design baseline.
- Paperclip-specific concerns (env injection, skill sync, metadata contracts, registry deps) are explicitly stripped from the extracted runtime. Plugin-owned hooks replace them.
- Agent configuration is repo-local (`.claude/agents.json`), not pulled from Paperclip state or company exports. This makes the plugin usable in any repo without Paperclip.
- The companion script is the authoritative runtime state store — job status, results, and cancel state live on disk under `CLAUDE_PLUGIN_DATA`, not in Claude's context window.

## Constraints

- **Tech stack**: Node.js / TypeScript — matches existing adapter-utils and companion script conventions in the repo
- **No Paperclip dependency**: The plugin package and runtime core must have zero imports from Paperclip server, DB, or host-plugin SDK — enforced at package boundary
- **Local adapters only (v1)**: Adapter support is limited to six local CLI-backed types; no HTTP or remote adapters until v2
- **Plugin layout**: Must conform to Claude Code plugin spec (`marketplace.json`, `plugin.json`, commands structure) — same as `codex-plugin-cc` reference
- **CI compatibility**: Tests must pass without real AI CLI binaries installed; all adapter tests use fake CLIs and fixtures
- **State isolation**: Session and job state is workspace-scoped; no shared global state across repos

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Extract runtime core as separate publishable package | Enables standalone use without Paperclip; clean boundary enforces the no-dependency constraint | — Pending |
| Use `.claude/agents.json` as config path | Neutral namespace (not `paperclip`), repo-local, discoverable by Claude Code, consistent with `.claude/` conventions | — Pending |
| Companion script is source of truth for job state | Claude context window is ephemeral; disk-based state survives context resets and session boundaries | — Pending |
| Command namespace `/agents:*` not `/paperclip:*` | User-facing branding must be neutral and reusable outside Paperclip orgs | — Pending |
| One thin delegation subagent, not MCP tools | Command-based UX ships faster and mirrors proven `codex-plugin-cc` pattern; MCP deferred to v2 | — Pending |
| Background mode uses detached Node worker process | Matches codex-companion pattern; allows long-running agents without blocking Claude session | — Pending |
| Session scoped to `(workspace root, agent id)` | Prevents cross-repo session pollution; makes session semantics predictable | — Pending |

---
*Last updated: 2026-04-04 after Phase 2 Runtime Core completion*
