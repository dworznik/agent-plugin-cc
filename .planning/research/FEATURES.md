# Feature Research

**Domain:** Claude Code plugin — multi-agent CLI orchestrator
**Researched:** 2026-04-04
**Confidence:** HIGH (requirements are well-specified in PROJECT.md; domain is well-understood from codex-plugin-cc reference)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `/agents:setup` interactive wizard | First-run onboarding is expected for any developer tool; users won't read docs | MEDIUM | Must validate JSON Schema on write; guard against malformed `agents.json` |
| `/agents:list` — show configured agents | Users need discoverability before they can run anything | LOW | Read `.claude/agents.json`, format as table with id/label/description/adapter |
| `/agents:task` — run a task on a named agent | Core action of the plugin; without this nothing else matters | HIGH | Dispatches to companion script; must handle foreground + background modes |
| `/agents:status <job-id>` — poll job status | Background jobs are useless without status visibility | LOW | Reads persisted job metadata from disk; no live process needed |
| `/agents:result <job-id>` — retrieve output | Users need to get the result back into Claude's context | LOW | Reads result file from `CLAUDE_PLUGIN_DATA/state/<hash>/results/` |
| `/agents:cancel <job-id>` — cancel a running job | Users will start long-running tasks and change their mind | MEDIUM | Must signal detached worker process; update cancel bookkeeping atomically |
| Persistent session per `(workspace, agent-id)` | Stateful agents (Claude, Gemini) need conversation continuity across invocations | HIGH | Session encoded/decoded per adapter protocol; `--fresh` and `--resume` flags |
| JSON Schema validation of `agents.json` | Misconfigured adapters cause cryptic runtime errors; early validation is expected | MEDIUM | AJV or similar at companion startup; clear error messages with field paths |
| Foreground mode (blocking, returns output inline) | Short tasks shouldn't require polling; users expect synchronous behavior for quick prompts | MEDIUM | Companion stdout piped back to Claude; timeout guard required |
| Background mode (detached, returns job-id) | Long-running tasks can't block the Claude session | HIGH | Detached Node worker; job-id returned immediately; state written to disk |
| Adapter smoke test / health-check | Users need to verify their adapter config works before running real tasks | MEDIUM | `--test` flag or test subcommand on companion; fake CLI in CI |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Thin delegation subagent (auto-selects best agent) | Users describe a task in natural language; Claude picks the right agent by matching task to agent `description` — zero manual routing | MEDIUM | One subagent reads agent descriptions, scores match, invokes companion; no multi-step reasoning needed |
| Zero Paperclip infrastructure requirement | Any repo can use this plugin without a server, database, or Paperclip account — deploy friction is near zero | HIGH | Package boundary enforcement; no `packages/paperclip-*` imports; extracted runtime package is the moat |
| Workspace-hashed state isolation | Multiple repos can run the same agent ids without state collisions — critical for developers working across many projects | MEDIUM | `CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>/` partitioning |
| Six adapter types out of the box | Covers the five most popular AI CLIs plus Pi; users don't need to write adapter glue | HIGH | `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local` — each with its own session codec and output parser |
| Companion script as durable state authority | Job state survives Claude context resets and session expiry — unlike plugins that store state in Claude's memory | MEDIUM | Disk-based job metadata; companion reads state on every query regardless of Claude session age |
| CI-safe fixture-based testing | Plugin can be tested in any CI without installing real AI CLIs — lowers contributor barrier | MEDIUM | Fake CLI shims per adapter; fixture JSONL outputs; companion tested end-to-end with stubs |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Do not build these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time streaming output in Claude UI | Feels more interactive; users want to see progress | Claude Code slash command UX doesn't natively support streaming into the chat; faking it requires polling hacks that break conversation flow | Use structured progress updates emitted by companion and fetched via `/agents:status`; print final result via `/agents:result` |
| Cross-workspace session reuse | "I want my Claude session from project A to continue in project B" | Sessions contain repo-specific context; reuse creates subtle contamination bugs that are hard to debug | Sessions are keyed by `(workspace root, agent id)`; `--fresh` is the escape hatch when users want a clean slate |
| MCP tools UX (v1) | MCP feels more native to Claude; tools-first UX is appealing | MCP protocol adds setup complexity, requires tool registration, and the slash command pattern is already proven by `codex-plugin-cc`; building both in v1 splits focus | Ship slash commands now; add MCP interface in v2 after slash commands are validated |
| Remote/HTTP adapters (v1) | Users want to hit hosted Claude, GPT-4, etc. | Remote adapters require auth management, rate limiting, error handling for network failures, and retry logic — tripling implementation surface for v1 | v1 is local-CLI-only; `process`, `http`, `openclaw_gateway` adapters ship in v2 |
| Paperclip env injection (`PAPERCLIP_*`) | Feels like it should work since plugin lives in Paperclip repo | Injecting Paperclip env creates an invisible dependency that breaks the "zero Paperclip infrastructure" guarantee; users outside Paperclip orgs will silently get undefined env vars | Plugin-owned hooks (`buildAgentEnv`, `resolveInstructions`) replace control-plane concerns cleanly |
| Global agent registry / shared config | Centralized config means one agents.json for all repos | Breaks workspace isolation; requires a config server or shared filesystem conventions; diverges from `.claude/` repo-local pattern | Config is repo-local at `.claude/agents.json`; each repo defines its own agents |
| Auto-update / version pinning for adapter CLIs | Nice to ensure consistent adapter behavior | Package management for external CLI binaries is OS-dependent and fragile; out of scope for a plugin | Document minimum supported CLI versions in `agents.json` schema; adapter validates at startup |

---

## Feature Dependencies

```
/agents:task (foreground or background)
    └──requires──> agents.json loaded & validated
                       └──requires──> /agents:setup (or manual agents.json creation)
    └──requires──> companion script (locates workspace root, runs adapter)
    └──requires──> adapter runtime package (child-process runner, codec, parser)

/agents:status <job-id>
    └──requires──> background /agents:task (produced the job-id)
    └──requires──> companion state on disk

/agents:result <job-id>
    └──requires──> /agents:status → completed
    └──requires──> result file written by companion worker

/agents:cancel <job-id>
    └──requires──> background /agents:task (job must be running)
    └──requires──> cancel bookkeeping in companion state

Session persistence (--resume)
    └──requires──> /agents:task run at least once (session created)
    └──requires──> session codec per adapter type

Delegation subagent (auto-routing)
    └──requires──> /agents:list (agent descriptions must be loaded)
    └──enhances──> /agents:task (subagent invokes it on user's behalf)

JSON Schema validation
    └──requires──> agents.json exists (from /agents:setup or manual)
    └──enhances──> all commands (prevents runtime errors from bad config)
```

### Dependency Notes

- **`/agents:task` requires `agents.json`:** All execution depends on config being present and valid. `/agents:setup` is the blessed path to create it.
- **`/agents:status` and `/agents:result` require a prior background task:** These commands are only useful after background dispatch; they must handle the case where job-id is invalid or expired gracefully.
- **Session persistence requires per-adapter codec:** Each of the six adapters has a different session wire format; the codec is in the extracted runtime package, not the plugin command layer.
- **Delegation subagent enhances `/agents:task`:** It's a convenience layer, not a replacement. Users can still call `/agents:task --agent <id>` directly to skip delegation.
- **JSON Schema validation enhances all commands:** Every command that touches `agents.json` should re-validate on load; don't trust a cached parse from setup time.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core value proposition: "run any configured local agent as a background job from Claude Code."

- [ ] `/agents:setup` — interactive config wizard that writes `.claude/agents.json` with schema validation
- [ ] `/agents:list` — display configured agents with id, label, description, adapter type
- [ ] `/agents:task` — run a task on a named agent; foreground for short tasks, background for long ones
- [ ] `/agents:status <job-id>` — poll status of a background job (pending/running/completed/failed/cancelled)
- [ ] `/agents:result <job-id>` — retrieve and display completed job output in Claude session
- [ ] `/agents:cancel <job-id>` — cancel a running background job
- [ ] Six adapters: `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`
- [ ] Persistent sessions per `(workspace, agent-id)` with `--fresh` and `--resume` flags
- [ ] Companion script as state authority (job metadata, results, cancel state on disk)
- [ ] One thin delegation subagent for natural-language task routing
- [ ] Plugin layout conforming to Claude Code spec (`marketplace.json`, `plugin.json`, commands, agents, scripts)
- [ ] Test suite: runtime unit tests, per-adapter smoke tests with fake CLIs, companion integration tests, layout tests

### Add After Validation (v1.x)

Features to add once core is proven working with real users.

- [ ] `--timeout` flag on `/agents:task` — currently adapter-level timeout exists but no user-facing control; add after validating default timeout behavior in the wild
- [ ] Output format options (plain, JSON, markdown) on `/agents:result` — wait to see what format users actually want before adding flags
- [ ] `/agents:logs <job-id>` — stream companion logs for a job; useful for debugging long tasks; add if users ask for it

### Future Consideration (v2+)

Features to defer until v1 is validated and adopted.

- [ ] MCP tools interface — command-based UX ships first; MCP adds protocol complexity without validating new value
- [ ] Remote/HTTP adapters (`process`, `http`, `openclaw_gateway`) — adds auth, retry, rate-limit surface; defer until local adapters are proven
- [ ] Cross-workspace session sharing — requires solving session contamination problem; defer until workspace isolation semantics are understood
- [ ] Web UI for job monitoring — out of scope for a CLI plugin; consider only if plugin becomes widely adopted

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `/agents:task` (foreground + background) | HIGH | HIGH | P1 |
| `/agents:setup` wizard | HIGH | MEDIUM | P1 |
| `/agents:status` + `/agents:result` | HIGH | LOW | P1 |
| Six adapter types | HIGH | HIGH | P1 |
| Persistent sessions per workspace/agent | HIGH | HIGH | P1 |
| `/agents:cancel` | MEDIUM | MEDIUM | P1 |
| `/agents:list` | MEDIUM | LOW | P1 |
| JSON Schema validation of `agents.json` | HIGH | MEDIUM | P1 |
| Delegation subagent (auto-routing) | MEDIUM | MEDIUM | P1 |
| Plugin layout conformance | HIGH | LOW | P1 |
| CI-safe fixture tests | MEDIUM | MEDIUM | P1 |
| `--timeout` user flag on task | LOW | LOW | P2 |
| `/agents:logs` streaming | LOW | MEDIUM | P2 |
| Output format flags on result | LOW | LOW | P2 |
| MCP tools interface | MEDIUM | HIGH | P3 |
| Remote adapters | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | codex-plugin-cc (reference) | Hypothetical direct MCP approach | Our Approach |
|---------|-----------------------------|---------------------------------|--------------|
| Command surface | Slash commands | MCP tools | Slash commands — same as reference; proven UX |
| Agent selection | Explicit `--agent` flag | Tool parameter | Delegation subagent adds natural-language routing on top of explicit selection |
| Background jobs | Detached worker + job-id | Not native to MCP | Same pattern as codex-plugin-cc; companion is state authority |
| Session persistence | Per-workspace session files | Stateless by default | Per `(workspace, agent-id)` with `--fresh`/`--resume` flags |
| Config format | Hardcoded single adapter | N/A | `agents.json` with schema validation and multi-adapter support |
| Adapter coverage | `codex_local` only | Depends on tool impl | Six adapters out of the box: claude, codex, cursor, gemini, opencode, pi |
| Paperclip dependency | Optional (codex plugin is standalone) | None | Zero — enforced at package boundary |
| State storage | CLAUDE_PLUGIN_DATA disk | Claude context | CLAUDE_PLUGIN_DATA disk — survives context resets |
| CI testing | Fixture-based fake CLIs | N/A | Fixture-based; no real binaries required |

---

## Sources

- PROJECT.md requirements (primary source — HIGH confidence)
- `codex-plugin-cc` reference implementation pattern (referenced in project context — HIGH confidence)
- Claude Code plugin spec conventions (`.claude-plugin/` layout — MEDIUM confidence, derived from project constraints)
- General knowledge of Claude Code slash command UX patterns (MEDIUM confidence)

---
*Feature research for: standalone universal agents plugin for Claude Code*
*Researched: 2026-04-04*
