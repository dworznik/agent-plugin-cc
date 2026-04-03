# Pitfalls Research

**Domain:** Claude Code plugin / Node.js CLI orchestration / detached background jobs / monorepo extraction
**Researched:** 2026-04-04
**Confidence:** HIGH (domain pitfalls derived from direct code analysis and known patterns in this problem space)

---

## Critical Pitfalls

### Pitfall 1: Paperclip Dependency Creep Through Transitive Imports

**What goes wrong:**
The extracted runtime package compiles clean but secretly imports a Paperclip module three levels deep — e.g., a utility function re-exported from `packages/adapter-utils` that itself imports a logger from `paperclip-server/lib/logger`. The plugin builds and tests pass (Paperclip is in the monorepo), but the package is unusable outside the monorepo without Paperclip installed.

**Why it happens:**
Developers extract code by copying the "entry points" they need and assume the dependency boundary is clean. Transitive imports in a monorepo are invisible until you actually try to install the package in isolation. TypeScript path aliases (`@paperclip/*`) don't make the dependency explicit in `package.json`, so it slips through.

**How to avoid:**
Enforce the boundary at the package level: add an ESLint rule (`no-restricted-imports`) in the runtime package that bans all `paperclip-*` and `@paperclip/*` imports. Run `npm pack` in CI and verify the output contains no Paperclip references with a script (`grep -r "paperclip" dist/`). Do this before any other tests.

**Warning signs:**
- Runtime package `package.json` lists any `paperclip-*` in `dependencies` or `peerDependencies`
- `tsc --traceResolution` output shows paths resolving outside the package directory
- Tests only pass when run from inside the monorepo root

**Phase to address:** Runtime extraction phase (first implementation phase)

---

### Pitfall 2: Orphan Processes from Incomplete Process Tree Termination

**What goes wrong:**
`/agents:cancel` sends SIGTERM to the detached worker PID recorded in the job metadata file. The worker receives and handles the signal, exits cleanly — but the CLI subprocess it spawned (e.g., `claude --dangerously-skip-permissions`) keeps running as an orphan because it's in a separate process group. The job shows as "cancelled" but the AI CLI is still consuming tokens and CPU in the background.

**Why it happens:**
`child_process.spawn` with `detached: true` puts the worker in its own process group, but the worker's own children may or may not be in the same group depending on whether the worker also spawns with `detached: true`. Node.js `process.kill(pid)` kills one PID, not the tree.

**How to avoid:**
Spawn CLI subprocesses inside the worker using a process group: `spawn(cmd, args, { detached: true })` and record both the worker PID and the CLI subprocess PID (or the process group ID = `-workerPid`). On cancel, call `process.kill(-pgid, 'SIGTERM')` to kill the entire group. Test this explicitly: write a cancel smoke test that verifies no child processes remain after cancel.

**Warning signs:**
- `ps aux | grep claude` shows lingering processes after cancel
- Job state shows "cancelled" but log file keeps growing
- System CPU stays elevated after cancel completes

**Phase to address:** Background job / companion script phase

---

### Pitfall 3: Job State File Race Conditions and Corruption

**What goes wrong:**
Two writes happen simultaneously to the same job state JSON file: the worker flushing a progress update and the companion responding to a `/agents:status` poll that also writes a "last-checked" timestamp. The file ends up with a partial write — truncated JSON — and the next status read crashes with a parse error, making the job unrecoverable without manual deletion.

**Why it happens:**
Node.js `fs.writeFileSync` is not atomic on any OS when the write crosses a filesystem block boundary. There is no built-in file locking in Node.js. In background mode, the worker and companion commands are separate processes with no shared mutex.

**How to avoid:**
Use atomic writes: write to a `.tmp` file then `fs.renameSync` to the target path. `rename` is atomic on POSIX filesystems. Never write partial state — always write the complete new state object in one rename. For reads, wrap `JSON.parse` in try/catch and treat parse failures as "state unknown, retry" rather than fatal errors.

**Warning signs:**
- Occasional `SyntaxError: Unexpected end of JSON` in companion logs
- Status reports intermittently show wrong state
- State files are 0 bytes or end mid-token

**Phase to address:** Companion script / state persistence phase

---

### Pitfall 4: Session File Corruption on Crash Mid-Write

**What goes wrong:**
The companion finishes a task and begins writing the updated session file. The process is killed (OOM, signal, Claude Code restart) halfway through. The session file is now invalid JSON. The next invocation calls `loadSession`, gets a parse error, crashes instead of starting fresh, and the user sees an unhelpful error about a corrupted session rather than a clean recovery.

**Why it happens:**
Session files are written with a single `fs.writeFileSync`. A kill mid-write leaves a partial file. Error handling in `loadSession` propagates the parse error rather than treating it as "no session."

**How to avoid:**
Same atomic write pattern as job state (write to `.tmp`, rename). In `loadSession`, catch ALL errors (not just `ENOENT`) and treat them as "no session" — log a warning, delete the corrupt file, and continue with a fresh session. Add a session integrity check: validate the loaded object against the session schema before use.

**Warning signs:**
- Users report errors starting tasks after a previous session was interrupted
- Session files exist but have zero size or truncated content
- `--fresh` flag "fixes" issues that should not require fresh sessions

**Phase to address:** Session management phase

---

### Pitfall 5: Adapter Output Parser Tied to Specific CLI Version

**What goes wrong:**
The `claude_local` adapter parser is written against Claude CLI output format from version X. The user has version X+1 installed which changed JSON field names or added a new output mode. The parser silently discards all output (no match on expected fields), returning empty results. The task appears to "succeed" with no output.

**Why it happens:**
CLI output formats are treated as stable contracts but are not — AI CLI tools iterate rapidly. Parsers written against one version produce wrong output on another version without throwing errors if they're written defensively (return empty on no-match rather than throw).

**How to avoid:**
Version-gate the parsers: each adapter should emit a warning if the detected CLI version is outside the tested range. Use a "raw passthrough" fallback: if structured parsing fails, return the raw stdout/stderr as plain text output rather than empty. Add version detection to adapter smoke tests using fixtures that cover both old and new format variants. Document the tested CLI version range in `adapterConfig`.

**Warning signs:**
- Tasks complete with no output when run with certain adapter types
- `adapterConfig` has no version field or version range
- Smoke test fixtures only cover one output format per adapter

**Phase to address:** Adapter implementation phase (per-adapter)

---

### Pitfall 6: Missing `CLAUDE_PLUGIN_DATA` Fallback Causes Silent Failure

**What goes wrong:**
`CLAUDE_PLUGIN_DATA` is not set in the user's environment (e.g., they invoked the companion directly, not through Claude Code, or are running tests). The companion tries to create `undefined/state/...` and fails with a cryptic `ENOENT` or creates a literal `undefined/` directory in the current working directory.

**Why it happens:**
Developers assume the Claude Code runtime always injects `CLAUDE_PLUGIN_DATA` because it does in normal use. They don't test the "env var missing" path. The path construction `path.join(process.env.CLAUDE_PLUGIN_DATA, 'state', hash)` silently produces `undefined/state/hash` which Node.js allows as a string.

**How to avoid:**
Assert `CLAUDE_PLUGIN_DATA` at companion startup with a clear error: `if (!process.env.CLAUDE_PLUGIN_DATA) { console.error('CLAUDE_PLUGIN_DATA is not set — is this running inside Claude Code?'); process.exit(1); }`. Provide a fallback for tests: `CLAUDE_PLUGIN_DATA ?? path.join(os.tmpdir(), 'agents-plugin-test')`. Never let path construction silently use `undefined`.

**Warning signs:**
- A `undefined/` directory appears in the project root
- State files appear in unexpected locations
- Tests pass locally but fail in CI with missing state

**Phase to address:** Companion script / state persistence phase

---

### Pitfall 7: Plugin Layout Non-Conformance Causes Silent Load Failure

**What goes wrong:**
The plugin loads without error in development (Claude Code is forgiving about missing fields in development mode) but fails silently in production/installed mode because `marketplace.json` is missing a required field, `plugin.json` references a command file at the wrong relative path, or the `agents/` directory contains an agent definition with an invalid schema. Users see no commands registered with no error message.

**Why it happens:**
Plugin spec validation is not run during development if the developer loads the plugin via a local path. The spec may also have undocumented required fields that only manifest in the production marketplace flow.

**How to avoid:**
Write a plugin layout test that validates the exact file structure: all required files exist, JSON files parse without error, command files exist at the paths referenced in `plugin.json`, and agent definitions match the expected schema. Run this test in CI as a first-class test, not an afterthought. Mirror the exact directory structure from `codex-plugin-cc` as the reference — don't invent new structure.

**Warning signs:**
- Commands register in local dev but not after installation
- No error message when plugin fails to load
- `plugin.json` paths use absolute paths or `__dirname` rather than relative paths

**Phase to address:** Plugin scaffolding / layout phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy adapter code from `adapter-utils` without package extraction | Faster initial build | Plugin imports from Paperclip path; zero-dependency claim broken | Never — extract to package from day one |
| Store job results in Claude context window instead of disk | Simpler companion implementation | Results lost on context reset; contradicts core design decision | Never |
| Single monolithic companion script (no modules) | Fast prototyping | Untestable; adapter logic mixed with job state logic | MVP only — refactor before shipping adapters 3-6 |
| Hardcode workspace hash algorithm (e.g., `path.basename`) | Simple implementation | Collisions across repos with same name; hash changes = lost sessions | Never — use a stable content hash of the absolute path |
| Skip JSON Schema validation on `agents.json` at startup | Slightly faster load | Silent misconfiguration; `adapterType` typos cause confusing runtime errors | Never |
| Use `fs.writeFileSync` directly for state (no atomic rename) | Less code | State corruption on crash or concurrent writes | Never for production state files |
| Fake CLI outputs that return empty string | Simple test fixture | Parser bugs that only manifest on real output go undetected | Never — fixtures must include realistic output format per CLI version |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Claude CLI (`claude_local`) | Assuming `--output-format json` produces stable schema across versions | Parse the `result` field only; treat unknown fields as optional; log raw output on parse failure |
| Codex CLI (`codex_local`) | Parsing stdout directly without checking exit code | Always check exit code first; non-zero exit with content in stderr means error, not result |
| Gemini CLI (`gemini_local`) | Assuming JSONL streaming is line-buffered | Gemini CLI may flush partial JSON lines; buffer until `\n` before parsing each line |
| Cursor (`cursor`) | Expecting cursor to behave like a headless CLI | Cursor may require a GUI context; verify headless mode is supported before adding adapter |
| `opencode_local` | Assuming OpenCode CLI flags match Codex flags (similar names) | Each adapter must have its own flag mapping; never share flag configuration between adapters |
| Claude Code plugin host | Using `process.cwd()` to locate workspace root | Use the companion's workspace root detection (walk up from CWD looking for `.git`); CWD is not reliable in plugin context |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling `/agents:status` in a tight loop | High disk I/O from repeated file reads; Claude context fill-up | Rate-limit status polling in the subagent; use exponential backoff | Immediately if user polls manually; worse with multiple background jobs |
| Writing full result content to job metadata file | Large results (e.g., 50KB code output) slow down all status reads because metadata file is read on every status check | Separate result storage: metadata file has job state only; result stored in separate `result.txt` file | When tasks generate >10KB output |
| Loading all session files on startup | Companion startup slow in repos with many agents and long history | Lazy-load sessions: only load the session for the current `(workspace, agentId)` pair | With >20 agents or long-running projects |
| Logging every token of streaming output to disk | Log files grow to 100MB+ for long tasks | Log only structured events (start, progress %, complete, error); raw output goes to result file only | During any task >5 minutes with verbose CLI output |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing API keys in `adapterConfig` inside `.claude/agents.json` and committing the file | API key exposure via git history | Add `.claude/agents.json` to `.gitignore` by default in `/agents:setup`; document that secrets belong in env vars, not config; reference env var names in config instead of values |
| Passing user-supplied `taskDescription` directly to shell without sanitization | Command injection if companion builds a shell command string | Never use shell string interpolation for task input; always pass as argv array to `spawn`; use `shell: false` in spawn options |
| Writing world-readable state files under `CLAUDE_PLUGIN_DATA` | Other processes or users on shared machines can read task outputs and session tokens | Set `fs.writeFileSync` with mode `0o600` (owner read/write only) for all state, session, and result files |
| Not validating `adapterType` against the allowed enum before spawning | Malformed config could cause the companion to spawn arbitrary executables | Validate `adapterType` against the hard-coded allowlist before any spawn call; reject unknown adapter types with a clear error |
| Logging task prompts to disk in plaintext | Sensitive prompts (containing code, credentials, business logic) persist on disk indefinitely | Do not log the task prompt to the log file; log only job metadata (id, agent, timestamp, status). Store prompt in the result file only if explicitly requested |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback during foreground task execution | User sees nothing for minutes; thinks it hung; kills the process | Stream progress tokens to stdout during foreground mode; at minimum print a spinner or "running..." with elapsed time |
| Background job ID is a UUID with no human-readable component | User can't tell which job is which from `/agents:status` output | Include a short slug in job ID: `{agentId}-{timestamp}` or `{agentId}-{task-hash-prefix}`; display the original task description in status |
| `/agents:cancel` returns before confirming the process died | User believes job is cancelled but it's still running | After sending SIGTERM, poll for up to 5 seconds confirming the PID is gone before returning; return error if process persists |
| `/agents:setup` requires manual JSON editing | Config errors are common; users don't know the schema | `/agents:setup` should interactively prompt for each field and write validated JSON; never ask users to hand-edit the config file |
| No way to see what's in the current session | Users can't diagnose unexpected agent behavior without session transparency | `/agents:list` should show session age, size, and last-used timestamp alongside each configured agent |

---

## "Looks Done But Isn't" Checklist

- [ ] **Runtime package extraction:** Verify `npm pack` and install in a fresh directory outside the monorepo produces a working import — TypeScript consumers get real types, not `any`
- [ ] **Background job cancel:** Verify with `ps aux` after cancel that BOTH the worker process AND the CLI subprocess are gone — not just the worker
- [ ] **Session persistence:** Verify session survives a companion process restart (kill -9 the companion mid-task, restart, resume) — not just a normal exit
- [ ] **Config validation:** Verify that a config with a typo in `adapterType` produces a clear, actionable error message — not a runtime crash 10 lines deep
- [ ] **CI tests:** Verify the test suite passes in a clean Docker container with NONE of the six AI CLI binaries installed — fake CLIs only
- [ ] **Plugin layout:** Verify the plugin loads correctly after `npm install` in a fresh Claude Code extension environment — not just from the development symlink
- [ ] **Foreground streaming:** Verify that long-running foreground tasks produce visible progress output — not just a blocking cursor
- [ ] **State isolation:** Verify that two different repos with the same directory name (e.g., both named `myproject`) get separate state directories — hash is on the full absolute path

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Transitive Paperclip dependency discovered post-release | HIGH | Audit all imports with `madge --circular --webpack-config`; extract offending modules into standalone utilities; publish patch release; users must upgrade |
| Orphan processes accumulate | MEDIUM | Add a companion `gc` command that scans all job state files, checks which PIDs are still alive, and kills orphans; run on startup as a health check |
| Corrupt state directory | LOW | Delete `CLAUDE_PLUGIN_DATA/state/<workspace-hash>/` and restart; sessions and jobs are lost but the plugin recovers immediately |
| Session file corrupted for one agent | LOW | Delete `sessions/<agentId>.json`; next invocation starts a fresh session automatically |
| Plugin fails to load after Claude Code update | MEDIUM | Compare `plugin.json` and `marketplace.json` against the new spec; fix missing required fields; re-install the plugin |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Paperclip dependency creep | Runtime package extraction | `npm pack` + install in isolated directory; `grep -r "paperclip" dist/` returns empty |
| Orphan processes | Background job / companion implementation | Cancel smoke test: verify `ps aux` shows no lingering CLI subprocess after cancel |
| State file race conditions | State persistence implementation | Concurrent write test: two processes writing to same job file simultaneously; read back produces valid JSON |
| Session corruption on crash | Session management implementation | Kill -9 mid-write test; verify next startup recovers gracefully without user action |
| Adapter parser version mismatch | Adapter implementation (per adapter) | Smoke tests with two fixture variants per adapter (current version + previous version output) |
| Missing `CLAUDE_PLUGIN_DATA` | Companion script scaffolding | Test suite sets `CLAUDE_PLUGIN_DATA` explicitly; test without env var produces clear error, not `undefined/` path |
| Plugin layout non-conformance | Plugin scaffolding phase | Layout test validates all required files exist and JSON schemas are valid before any feature work |
| API key in committed config | Setup command implementation | `/agents:setup` writes config to `.gitignore`d path by default; setup tests verify gitignore entry created |

---

## Sources

- Direct analysis of PROJECT.md constraints and architectural decisions (2026-04-04)
- Node.js `child_process` spawn behavior with `detached: true` — known process group semantics
- Atomic file write pattern — POSIX `rename(2)` atomicity guarantee
- Claude Code plugin spec — inferred from `codex-plugin-cc` reference design mentioned in project context
- General CLI plugin development and monorepo extraction experience patterns
- OWASP command injection prevention (argv array vs. shell string construction)

---
*Pitfalls research for: Claude Code standalone universal agents plugin (Node.js/TypeScript)*
*Researched: 2026-04-04*
