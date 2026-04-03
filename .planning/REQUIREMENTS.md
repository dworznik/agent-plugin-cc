# Requirements: Standalone Universal Agents Plugin for Claude Code

**Defined:** 2026-04-04
**Core Value:** A developer can run any configured local agent as a background job from Claude Code, track it, and retrieve its output — with zero Paperclip infrastructure.

## v1 Requirements

### Plugin Layout

- [x] **LAYOUT-01**: Plugin package contains `.claude-plugin/marketplace.json` with valid plugin metadata (name, version, description, author)
- [x] **LAYOUT-02**: Plugin package contains `plugin.json` declaring all six commands and the delegation subagent
- [x] **LAYOUT-03**: Plugin package contains `commands/` directory with one file per command (`setup.md`, `list.md`, `task.md`, `status.md`, `result.md`, `cancel.md`)
- [x] **LAYOUT-04**: Plugin package contains `agents/` directory with the delegation subagent definition
- [x] **LAYOUT-05**: Plugin package contains `scripts/` directory with the Node companion script
- [x] **LAYOUT-06**: Plugin layout passes a structural conformance test that validates all required files are present

### Configuration

- [x] **CONF-01**: `agents.json` schema defines `defaultAgent` (string, optional) and `agents[]` array with required fields `id`, `label`, `description`, `adapterType`, and optional `adapterConfig`
- [x] **CONF-02**: Companion script validates `agents.json` against JSON Schema at startup and exits with a human-readable error message that includes the failing field path when validation fails
- [x] **CONF-03**: `adapterType` field in `agents.json` is restricted to exactly: `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`
- [x] **CONF-04**: Companion script locates the workspace root by walking up from the current directory to find the nearest `.claude/agents.json`
- [ ] **CONF-05**: `/agents:setup` wizard writes a valid `agents.json` to `.claude/agents.json` and validates the written file before confirming success
- [ ] **CONF-06**: `/agents:setup` prompts for `id`, `label`, `description`, `adapterType`, and adapter-specific `adapterConfig` fields for each agent added

### Commands

- [ ] **CMD-01**: `/agents:list` reads `.claude/agents.json` and displays all agents in a table with columns: id, label, description, adapterType
- [ ] **CMD-02**: `/agents:list` returns a clear error message when `.claude/agents.json` does not exist
- [ ] **CMD-03**: `/agents:task --agent <id> <prompt>` runs the specified agent in foreground mode and returns its output inline in the Claude session
- [ ] **CMD-04**: `/agents:task --agent <id> --background <prompt>` spawns a detached background worker, returns a job-id immediately, and does not block the Claude session
- [ ] **CMD-05**: `/agents:task` returns a clear error when the specified `--agent <id>` is not found in `agents.json`
- [ ] **CMD-06**: `/agents:task --agent <id> --fresh <prompt>` discards any existing session for `(workspace, agent-id)` and starts a new one
- [ ] **CMD-07**: `/agents:task --agent <id> --resume <prompt>` reuses the existing session for `(workspace, agent-id)` if one exists
- [ ] **CMD-08**: `/agents:status <job-id>` reads job metadata from disk and returns one of: `pending`, `running`, `completed`, `failed`, `cancelled`
- [ ] **CMD-09**: `/agents:status <job-id>` returns a clear error message when the job-id does not exist in the state directory
- [ ] **CMD-10**: `/agents:result <job-id>` reads the result file from disk and prints the agent output into the Claude session
- [ ] **CMD-11**: `/agents:result <job-id>` returns a clear error when the job has not yet completed or the job-id is invalid
- [ ] **CMD-12**: `/agents:cancel <job-id>` sends a cancellation signal to the running background worker and writes `cancelled` status to the job metadata atomically
- [ ] **CMD-13**: `/agents:cancel <job-id>` returns a clear error when the job is not in `running` or `pending` state

### Adapter Runtime

- [ ] **ADPT-01**: Runtime package has zero imports from Paperclip server, database, or host-plugin SDK — enforced by a package-boundary lint rule or import check in CI
- [x] **ADPT-02**: Runtime package exports five plugin-owned hook interfaces: `buildAgentEnv`, `resolveInstructions`, `loadSession`, `saveSession`, `emitLog`
- [x] **ADPT-03**: `claude_local` adapter invokes the `claude` CLI, encodes/decodes session using Claude's session wire format, and parses its stdout output
- [x] **ADPT-04**: `codex_local` adapter invokes the `codex` CLI, encodes/decodes session using Codex's session wire format, and parses its stdout output
- [x] **ADPT-05**: `cursor` adapter invokes the Cursor CLI, encodes/decodes session using Cursor's session wire format, and parses its stdout output
- [x] **ADPT-06**: `gemini_local` adapter invokes the `gemini` CLI, encodes/decodes session using Gemini's session wire format, and parses its stdout output
- [x] **ADPT-07**: `opencode_local` adapter invokes the `opencode` CLI, encodes/decodes session using Opencode's session wire format, and parses its stdout output
- [x] **ADPT-08**: `pi_local` adapter invokes the Pi CLI, encodes/decodes session using Pi's session wire format, and parses its stdout output
- [x] **ADPT-09**: Child-process runner enforces a configurable timeout and kills the child process and returns a timeout error when the limit is exceeded
- [x] **ADPT-10**: Runtime package exports JSON and JSONL parsing utilities that handle malformed input without throwing unhandled exceptions

### Session Persistence

- [x] **SESS-01**: Companion script creates a session file at `CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>/sessions/<agent-id>` after the first successful task run
- [x] **SESS-02**: Companion script loads the existing session file and passes it to the adapter codec when `--resume` flag is set and a session file exists
- [x] **SESS-03**: Companion script deletes the session file for `(workspace, agent-id)` when `--fresh` flag is set, then runs the task without a session
- [x] **SESS-04**: Sessions for different workspace roots are stored in separate hash-partitioned directories and cannot be accessed cross-workspace

### Background Jobs

- [ ] **JOB-01**: Background worker is spawned as a detached Node process that continues running after the parent companion script exits
- [ ] **JOB-02**: Companion script writes job metadata (job-id, agent-id, status, start time, pid) to `CLAUDE_PLUGIN_DATA/state/<hash>/jobs/<job-id>.json` before returning the job-id
- [ ] **JOB-03**: Background worker updates job metadata status to `running` when it starts executing the adapter
- [ ] **JOB-04**: Background worker writes the agent output to `CLAUDE_PLUGIN_DATA/state/<hash>/results/<job-id>` and updates job status to `completed` on success
- [ ] **JOB-05**: Background worker updates job status to `failed` and writes the error message to job metadata when the adapter exits with an error
- [ ] **JOB-06**: Cancel operation writes a cancel sentinel file to `CLAUDE_PLUGIN_DATA/state/<hash>/cancel/<job-id>` and the background worker polls for it and terminates when detected
- [ ] **JOB-07**: Job-id is a unique identifier (UUID or similar) generated at dispatch time and returned to the user immediately in background mode

### Delegation Subagent

- [ ] **DELEG-01**: Delegation subagent reads all agent `description` fields from `agents.json` and selects the best-matching agent for the user's natural-language task description
- [ ] **DELEG-02**: Delegation subagent invokes exactly one companion command after selecting an agent — it does not execute multiple agents in parallel
- [ ] **DELEG-03**: Delegation subagent falls back to displaying a list of available agents with their descriptions when no agent description matches the task

### Error Handling

- [ ] **ERR-01**: All six commands return a non-zero exit code and a human-readable error message when `agents.json` is missing
- [ ] **ERR-02**: All six commands return a non-zero exit code and a human-readable error message when `agents.json` fails schema validation
- [x] **ERR-03**: Companion script catches and logs adapter process errors (non-zero exit, crash, timeout) without crashing the companion process itself
- [ ] **ERR-04**: Background worker writes the error details to job metadata when the adapter fails so `/agents:status` and `/agents:result` can surface the failure cause
- [x] **ERR-05**: Companion script returns a descriptive error when `CLAUDE_PLUGIN_DATA` is not set or is not writable

### Logging

- [x] **LOG-01**: Companion script writes structured log entries (timestamp, level, job-id, message) to `CLAUDE_PLUGIN_DATA/state/<hash>/logs/<job-id>.log` for each background job
- [x] **LOG-02**: Adapter execution start, completion, and failure events are logged with timing information
- [x] **LOG-03**: `emitLog` hook is called for each log entry, allowing plugin consumers to intercept logs without modifying the runtime package

### Testing

- [x] **TEST-01**: Unit tests cover all runtime helper functions (child-process runner, session codec, JSON/JSONL parser, timeout handler) without requiring real CLI binaries
- [ ] **TEST-02**: Each of the six adapters has a smoke test that uses a fake CLI shim and verifies the adapter correctly invokes the CLI, parses its output, and encodes/decodes a session
- [ ] **TEST-03**: Companion integration tests cover config load+validate, foreground task execution, background job dispatch, status poll, result retrieval, and cancellation — all using fake CLIs
- [x] **TEST-04**: Plugin layout test verifies all required files (`marketplace.json`, `plugin.json`, command files, agent file, companion script) are present at the correct paths
- [ ] **TEST-05**: All tests pass in CI without any real AI CLI binaries installed

---

## v2 Requirements

### Extended Commands

- **XCMD-01**: `/agents:task` accepts a `--timeout <seconds>` flag that overrides the adapter-level default timeout for that invocation
- **XCMD-02**: `/agents:result <job-id>` accepts a `--format <plain|json|markdown>` flag to control output formatting
- **XCMD-03**: `/agents:logs <job-id>` reads and displays the companion log file for the given job-id

### Remote Adapters

- **RADPT-01**: `http` adapter type sends the prompt to a configurable HTTP endpoint and parses the JSON response
- **RADPT-02**: `process` adapter type spawns a local process with a configurable command and args, distinct from the six local CLI adapters
- **RADPT-03**: `openclaw_gateway` adapter type routes requests through the Openclaw gateway API

### MCP Interface

- **MCP-01**: Plugin exposes MCP tools surface equivalent to the six slash commands
- **MCP-02**: MCP tools are registered automatically when the plugin is installed in a Claude Code session

### Observability

- **OBS-01**: `/agents:logs <job-id>` streams live log output for a running background job

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Paperclip API, server, database, or UI changes | Plugin must work with zero Paperclip infrastructure; any dependency defeats the core value proposition |
| `PAPERCLIP_*` env injection | Creates invisible dependency that breaks the zero-infrastructure guarantee; plugin-owned hooks replace this |
| Cross-workspace session reuse | Sessions contain repo-specific context; reuse creates contamination bugs that are hard to debug |
| Global agent registry / shared `agents.json` | Breaks workspace isolation; diverges from `.claude/` repo-local pattern |
| Real-time streaming output in Claude UI | Claude Code slash command UX doesn't natively support streaming; faking it requires polling hacks |
| MCP tools UX in v1 | Slash command pattern is proven by `codex-plugin-cc`; MCP adds protocol complexity without validating new value |
| Auto-update / version pinning for adapter CLIs | OS-dependent binary management is fragile and out of scope for a plugin |
| Real CLI binary tests in CI | Avoids binary installation requirements; fixture-based tests are sufficient for CI |
| Web UI for job monitoring | Out of scope for a CLI plugin |

---

## Traceability

Which phases cover which requirements. Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LAYOUT-01 | Phase 1 | Complete |
| LAYOUT-02 | Phase 1 | Complete |
| LAYOUT-03 | Phase 1 | Complete |
| LAYOUT-04 | Phase 1 | Complete |
| LAYOUT-05 | Phase 1 | Complete |
| LAYOUT-06 | Phase 1 | Complete |
| CONF-01 | Phase 2 | Complete |
| CONF-02 | Phase 2 | Complete |
| CONF-03 | Phase 2 | Complete |
| CONF-04 | Phase 2 | Complete |
| CONF-05 | Phase 3 | Pending |
| CONF-06 | Phase 3 | Pending |
| CMD-01 | Phase 3 | Pending |
| CMD-02 | Phase 3 | Pending |
| CMD-03 | Phase 3 | Pending |
| CMD-04 | Phase 3 | Pending |
| CMD-05 | Phase 3 | Pending |
| CMD-06 | Phase 3 | Pending |
| CMD-07 | Phase 3 | Pending |
| CMD-08 | Phase 3 | Pending |
| CMD-09 | Phase 3 | Pending |
| CMD-10 | Phase 3 | Pending |
| CMD-11 | Phase 3 | Pending |
| CMD-12 | Phase 3 | Pending |
| CMD-13 | Phase 3 | Pending |
| ADPT-01 | Phase 1 | Pending |
| ADPT-02 | Phase 2 | Complete |
| ADPT-03 | Phase 2 | Complete |
| ADPT-04 | Phase 2 | Complete |
| ADPT-05 | Phase 2 | Complete |
| ADPT-06 | Phase 2 | Complete |
| ADPT-07 | Phase 2 | Complete |
| ADPT-08 | Phase 2 | Complete |
| ADPT-09 | Phase 2 | Complete |
| ADPT-10 | Phase 2 | Complete |
| SESS-01 | Phase 2 | Complete |
| SESS-02 | Phase 2 | Complete |
| SESS-03 | Phase 2 | Complete |
| SESS-04 | Phase 2 | Complete |
| JOB-01 | Phase 3 | Pending |
| JOB-02 | Phase 3 | Pending |
| JOB-03 | Phase 3 | Pending |
| JOB-04 | Phase 3 | Pending |
| JOB-05 | Phase 3 | Pending |
| JOB-06 | Phase 3 | Pending |
| JOB-07 | Phase 3 | Pending |
| DELEG-01 | Phase 3 | Pending |
| DELEG-02 | Phase 3 | Pending |
| DELEG-03 | Phase 3 | Pending |
| ERR-01 | Phase 3 | Pending |
| ERR-02 | Phase 3 | Pending |
| ERR-03 | Phase 2 | Complete |
| ERR-04 | Phase 3 | Pending |
| ERR-05 | Phase 2 | Complete |
| LOG-01 | Phase 2 | Complete |
| LOG-02 | Phase 2 | Complete |
| LOG-03 | Phase 2 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 2 | Pending |
| TEST-03 | Phase 3 | Pending |
| TEST-04 | Phase 1 | Complete |
| TEST-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-04 after initial definition*
