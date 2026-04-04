# Phase 2: Runtime Core - Research

**Researched:** 2026-04-04
**Domain:** Node.js adapter runtime, CLI child-process management, zod schema validation, session persistence, vitest testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All adapter code lives in `packages/runtime` (the publishable package). Plugin companion imports adapters from runtime. Runtime is self-contained and reusable outside the plugin.
- **D-02:** Abstract `BaseAdapter` class with per-adapter overrides. Each adapter implements `execute()`, `parseOutput()`, `encodeSession()`, `decodeSession()`. Common timeout/kill logic lives in the base class.
- **D-03:** The five hook interfaces (`buildAgentEnv`, `resolveInstructions`, `loadSession`, `saveSession`, `emitLog`) ship with sensible default implementations. Companion can override any hook at initialization.
- **D-04:** `adapterConfig` is a discriminated union keyed by `adapterType`. Each adapter type defines its own zod schema. Validated per-adapter at load time.
- **D-05:** Unknown fields in `agents.json` are stripped silently (zod `.strip()` mode — this is zod's default for `z.object()`).
- **D-06:** Companion locates config by walking up from cwd to find `.claude/agents.json`. Fails with clear error if not found.
- **D-07:** Sessions stored as JSON with adapter-specific shape. Each adapter defines its own session schema.
- **D-08:** State directory path: `CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>/sessions/<agent-id>.json`.
- **D-09:** Corrupt session files trigger warning log + fresh start. Bad file deleted. Execution continues.
- **D-10:** Fake CLI shims are shell scripts that echo fixture output. Tests set PATH to include fixture directory.
- **D-11:** CLI output formats verified during research phase. Fixtures based on verified formats.
- **D-12:** Each adapter smoke test covers: successful output parsing, timeout kill, non-zero exit code error.
- **D-13:** Monorepo with npm workspaces: `packages/runtime` (publishable) and `packages/plugin` (companion + plugin).
- **D-14:** `zod` v3 is the single runtime dependency.
- **D-15:** `tsup` bundles companion to single `.cjs` file; `tsc` for runtime package type declarations.
- **D-16:** Paperclip boundary enforced by ESLint `no-restricted-imports` + `npm pack` CI check.

### Claude's Discretion

- Internal naming conventions for adapter files (e.g., `adapters/claude-local.ts` vs `adapters/claudeLocal.ts`)
- Exact zod schema field names for each adapter's `adapterConfig`
- Log entry format details beyond the structured fields (timestamp, level, job-id, message)
- Child-process spawning implementation details (spawn vs exec, stdio config)
- Workspace root walk-up algorithm implementation

### Deferred Ideas (OUT OF SCOPE)

- `cursor` headless mode was unconfirmed — **now confirmed**: `cursor agent --print` provides full headless mode with `--output-format text|json|stream-json`. No deferral needed.
- Remote/webhook adapters (`http`, `process`, `openclaw_gateway`) are v2 scope per PROJECT.md.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-01 | `agents.json` schema with `defaultAgent`, `agents[]` (id, label, description, adapterType, adapterConfig) | Zod discriminated union pattern verified; field names confirmed |
| CONF-02 | Validate on startup, exit with human-readable error including failing field path | `z.safeParse()` + `error.errors[0].path.join('.')` pattern documented |
| CONF-03 | `adapterType` restricted to six values | `z.enum([...])` or `z.literal()` within discriminated union |
| CONF-04 | Locate workspace root by walking up from cwd | Node.js `path.dirname` loop + `fs.existsSync` pattern; no external library needed |
| ADPT-02 | Export five hook interfaces with default impls | TypeScript interface + default impl object pattern |
| ADPT-03 | `claude_local`: invoke `claude` CLI, encode/decode session, parse stdout | CLI verified: `claude -p --output-format json --session-id <uuid>` |
| ADPT-04 | `codex_local`: invoke `codex` CLI, encode/decode session, parse stdout | CLI verified: `codex exec --json`; session resume via `codex exec resume <session-id>` |
| ADPT-05 | `cursor`: invoke Cursor CLI, encode/decode session, parse stdout | CLI verified: `cursor agent --print --output-format json`; resume via `--resume <chatId>` |
| ADPT-06 | `gemini_local`: invoke `gemini` CLI, encode/decode session, parse stdout | CLI verified: `gemini -o json`; resume via `--resume <sessionId|"latest">` |
| ADPT-07 | `opencode_local`: invoke `opencode` CLI, encode/decode session, parse stdout | CLI verified: `opencode run --format json`; resume via `--session <id>` or `--continue` |
| ADPT-08 | `pi_local`: invoke `pi` CLI (binary: `pi`), encode/decode session, parse stdout | CLI verified: `pi --mode print` or `pi --mode json`; resume via `--session <path>` |
| ADPT-09 | Configurable timeout, kills child process, returns timeout error | `AbortController` + `spawn({ signal })` pattern verified in Node.js v24 |
| ADPT-10 | JSON and JSONL parsing utilities that handle malformed input without throwing | Wrap `JSON.parse` in try/catch; JSONL: split on `\n`, skip invalid lines |
| SESS-01 | Create session file at `CLAUDE_PLUGIN_DATA/state/<sha256>/sessions/<agent-id>.json` | `crypto.createHash('sha256')` built into Node.js; `fs.mkdirSync(..., {recursive:true})` |
| SESS-02 | Load existing session when `--resume` flag set | `fs.readFileSync` + adapter `decodeSession()` |
| SESS-03 | Delete session file when `--fresh` flag set | `fs.unlinkSync` with existence check |
| SESS-04 | Sessions partitioned by workspace hash | SHA-256 of absolute path ensures deterministic partitioning |
| ERR-03 | Catch adapter process errors without crashing companion | `try/catch` around adapter execution + structured error return |
| ERR-05 | Descriptive error when `CLAUDE_PLUGIN_DATA` not set or not writable | `process.env.CLAUDE_PLUGIN_DATA` check + `fs.accessSync(dir, fs.constants.W_OK)` |
| LOG-01 | Structured log entries to `CLAUDE_PLUGIN_DATA/state/<hash>/logs/<job-id>.log` | `fs.appendFileSync` with JSON-serialized log entries |
| LOG-02 | Log execution start, completion, failure with timing | `Date.now()` before/after + duration calculation |
| LOG-03 | `emitLog` hook called for each log entry | Hook invocation in base logger before file write |
| TEST-01 | Unit tests for runtime helpers without real CLI binaries | Vitest 4.1.2 already configured in plugin; runtime needs vitest added |
| TEST-02 | Six adapter smoke tests with fake CLI shims | Shell script shims + `PATH` override in test setup; vitest `beforeEach` |
</phase_requirements>

---

## Summary

Phase 2 implements the runtime core: config loading/validation, six adapter classes, child-process execution with timeout, session persistence, and structured logging. The architecture is a `BaseAdapter` abstract class in `packages/runtime` with per-adapter subclasses, a companion entry point in `packages/plugin/src/companion/index.ts`, and vitest-based tests using shell script fake CLI shims.

All six target CLIs are available on this machine (claude 2.1.91, codex 0.114.0, cursor 3.0.9, gemini 0.20.0, opencode via `opencode run`, pi via `@mariozechner/pi-coding-agent` binary `pi`). However, **opencode and pi are NOT installed globally** — this confirms the design decision to test only against fake shims and not require real binaries.

Cursor headless mode is confirmed via `cursor agent --print --output-format json`. No deferral needed — cursor is fully implementable in v1.

**Primary recommendation:** Implement `BaseAdapter` with `AbortController`-based timeout in `packages/runtime/src/`, one adapter class per CLI, a `ConfigLoader` using `z.discriminatedUnion`, and session persistence using `crypto.createHash('sha256')`. Run all tests with vitest fake shims.

## Project Constraints (from CLAUDE.md)

- Never overwrite API keys in dotenv files
- When installing npm dependencies, always check whether the package contains type declarations. If not, install from a separate `@types/` package or generate them in the project.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 3.25.76 (installed) | Schema definition + TypeScript type inference | Single runtime dependency, discriminated union support, default `.strip()` behavior |
| typescript | 6.0.2 | Type safety | Locked in Phase 1 |
| node:crypto | built-in | SHA-256 workspace hash | No external dependency |
| node:child_process | built-in | Spawn adapter CLIs | Native, reliable, supports `AbortController` |
| node:fs | built-in | Session file I/O, log writing | Native |
| node:path | built-in | Workspace root walk-up | Native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.2 (installed) | Test runner | All runtime unit tests and smoke tests |
| tsup | 8.5.1 (installed) | Bundle companion to `.cjs` | Phase 1 decision; tsup.config.ts already set up |
| tsc | 6.0.2 | Generate `.d.ts` for runtime | runtime package uses `tsc --project tsconfig.json` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `AbortController` + `spawn({ signal })` | `setTimeout` + `proc.kill()` | AbortController is cleaner and composable; both patterns verified working on Node v24 |
| `z.discriminatedUnion` | `z.union` | discriminatedUnion gives better error messages with the discriminant key |
| `node:fs` (sync) | `node:fs/promises` (async) | Sync is simpler for companion startup path; async can be used inside adapters |

**Installation:**
```bash
# No new runtime dependencies needed — zod is already in packages/runtime/package.json
# Add vitest to packages/runtime devDependencies for runtime tests
npm install -D vitest --workspace packages/runtime
```

**Version verification (npm view output 2026-04-04):**
- `zod`: 4.3.6 is the latest npm release, but the **installed and locked version is 3.25.76** (zod v3 per D-14). Do not upgrade to v4 — it has breaking API changes.
- `vitest`: 4.1.2 (latest, already installed at root)
- `tsup`: 8.5.1 (latest, already installed)

## Architecture Patterns

### Recommended Project Structure
```
packages/runtime/src/
├── index.ts               # Re-exports all public API
├── types.ts               # ConfiguredAgent, StoredAgentSession, AgentJob, hook interfaces
├── config/
│   ├── schema.ts          # Zod schemas: AgentConfigSchema, discriminated adapterConfig union
│   └── loader.ts          # loadConfig(cwd): walk up, parse, validate, return typed config
├── adapters/
│   ├── base.ts            # BaseAdapter abstract class (execute, timeout, kill logic)
│   ├── claude-local.ts    # ClaudeLocalAdapter
│   ├── codex-local.ts     # CodexLocalAdapter
│   ├── cursor.ts          # CursorAdapter
│   ├── gemini-local.ts    # GeminiLocalAdapter
│   ├── opencode-local.ts  # OpencodeLocalAdapter
│   └── pi-local.ts        # PiLocalAdapter
├── session/
│   ├── paths.ts           # getSessionPath(workspaceRoot, agentId): CLAUDE_PLUGIN_DATA + sha256
│   ├── store.ts           # loadSession, saveSession, deleteSession, isCorrupt
│   └── hash.ts            # sha256(path): string
├── process/
│   ├── runner.ts          # spawnWithTimeout(cmd, args, opts): Promise<ProcessResult>
│   └── parse.ts           # parseJSON(str), parseJSONL(str): safe utilities
├── logging/
│   └── logger.ts          # createLogger(jobId, logPath, emitLog): Logger
└── hooks/
    └── defaults.ts        # Default implementations for all five hooks

packages/runtime/tests/
├── config/
│   ├── schema.test.ts
│   └── loader.test.ts
├── adapters/
│   ├── claude-local.test.ts
│   ├── codex-local.test.ts
│   ├── cursor.test.ts
│   ├── gemini-local.test.ts
│   ├── opencode-local.test.ts
│   └── pi-local.test.ts
├── session/
│   └── store.test.ts
├── process/
│   ├── runner.test.ts
│   └── parse.test.ts
├── fixtures/
│   └── shims/             # Shell script fake CLI shims
│       ├── claude          # #!/bin/sh; echo '{"result":"...","session_id":"abc"}'; exit 0
│       ├── codex           # #!/bin/sh; echo '{"type":"message","content":"..."}'; exit 0
│       ├── cursor          # #!/bin/sh; echo '{"result":"..."}'; exit 0
│       ├── gemini          # #!/bin/sh; echo '{"response":"..."}'; exit 0
│       ├── opencode        # #!/bin/sh; echo '{"type":"message"}'; exit 0
│       └── pi              # #!/bin/sh; echo '{"result":"..."}'; exit 0
└── helpers/
    └── path-override.ts   # beforeEach: prepend fixtures/shims to PATH

packages/plugin/src/companion/
└── index.ts               # CLI entry point: parse args, loadConfig, select adapter, run
```

### Pattern 1: Abstract BaseAdapter Class
**What:** Abstract class with concrete `execute()` template method, `AbortController`-based timeout, and abstract methods for each adapter to implement.
**When to use:** All adapter implementations inherit from this.
**Example:**
```typescript
// packages/runtime/src/adapters/base.ts
export abstract class BaseAdapter {
  abstract buildArgs(prompt: string, sessionId?: string): string[];
  abstract parseOutput(stdout: string): AdapterResult;
  abstract encodeSession(result: AdapterResult): string;
  abstract decodeSession(raw: string): string; // returns session ID / resume token

  async execute(prompt: string, opts: ExecuteOptions): Promise<AdapterResult> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? 60_000);
    try {
      const args = this.buildArgs(prompt, opts.sessionId);
      const result = await spawnWithTimeout(this.binaryName, args, {
        signal: ac.signal,
        env: { ...process.env, ...opts.env },
      });
      if (result.exitCode !== 0) throw new AdapterError('non-zero exit', result);
      return this.parseOutput(result.stdout);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ABORT_ERR') {
        throw new AdapterTimeoutError(opts.timeoutMs ?? 60_000);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
```

### Pattern 2: Zod Discriminated Union Config Schema
**What:** Top-level `agents.json` schema using `z.discriminatedUnion('adapterType', [...])` for per-adapter `adapterConfig` validation.
**When to use:** Config loading in `packages/runtime/src/config/schema.ts`.
**Example:**
```typescript
// packages/runtime/src/config/schema.ts
import { z } from 'zod';

const ClaudeLocalConfigSchema = z.object({
  adapterType: z.literal('claude_local'),
  model: z.string().optional(),
  maxBudgetUsd: z.number().optional(),
});
const CodexLocalConfigSchema = z.object({
  adapterType: z.literal('codex_local'),
  provider: z.string().optional(),
  model: z.string().optional(),
});
// ... repeat for cursor, gemini_local, opencode_local, pi_local

const AdapterConfigSchema = z.discriminatedUnion('adapterType', [
  ClaudeLocalConfigSchema, CodexLocalConfigSchema,
  CursorConfigSchema, GeminiLocalConfigSchema,
  OpencodeLocalConfigSchema, PiLocalConfigSchema,
]);

const AgentSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  adapterType: z.enum(['claude_local','codex_local','cursor','gemini_local','opencode_local','pi_local']),
  adapterConfig: AdapterConfigSchema.optional(),
});

export const AgentsConfigSchema = z.object({
  defaultAgent: z.string().optional(),
  agents: z.array(AgentSchema),
});
// Default behavior: z.object() strips unknown fields (no .strict() call needed)
```

### Pattern 3: Config Loader with Walk-Up
**What:** Walk from `cwd` up to filesystem root looking for `.claude/agents.json`.
**When to use:** Companion startup and all config-dependent operations.
**Example:**
```typescript
// packages/runtime/src/config/loader.ts
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function findConfigPath(startDir: string): string {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, '.claude', 'agents.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new ConfigNotFoundError(startDir);
    dir = parent;
  }
}

export function loadConfig(cwd: string) {
  const configPath = findConfigPath(cwd);
  const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  const result = AgentsConfigSchema.safeParse(raw);
  if (!result.success) {
    const fieldPath = result.error.errors[0].path.join('.');
    const message = result.error.errors[0].message;
    throw new ConfigValidationError(`agents.json invalid: ${fieldPath} — ${message}`);
  }
  return result.data;
}
```

### Pattern 4: SHA-256 Session Path
**What:** Deterministic, collision-free path for workspace-scoped sessions.
**When to use:** All session storage operations.
**Example:**
```typescript
// packages/runtime/src/session/hash.ts
import { createHash } from 'node:crypto';

export function workspaceHash(absolutePath: string): string {
  return createHash('sha256').update(absolutePath).digest('hex');
}

// packages/runtime/src/session/paths.ts
export function getSessionPath(workspaceRoot: string, agentId: string): string {
  const base = process.env['CLAUDE_PLUGIN_DATA'];
  if (!base) throw new EnvMissingError('CLAUDE_PLUGIN_DATA');
  const hash = workspaceHash(workspaceRoot);
  return join(base, 'state', hash, 'sessions', `${agentId}.json`);
}
```

### Pattern 5: Fake CLI Shim for Tests
**What:** Shell scripts that echo fixture output and exit 0 (or non-zero for error scenarios).
**When to use:** All adapter smoke tests via PATH override.
**Example:**
```bash
#!/bin/sh
# packages/runtime/tests/fixtures/shims/claude
echo '{"type":"result","subtype":"success","result":"Hello from claude","session_id":"test-session-123","cost_usd":0.001,"duration_ms":500}'
exit 0
```
```typescript
// packages/runtime/tests/helpers/path-override.ts
import { beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';

const SHIMS_DIR = join(__dirname, '..', 'fixtures', 'shims');
let origPath: string;

beforeEach(() => {
  origPath = process.env['PATH'] ?? '';
  process.env['PATH'] = `${SHIMS_DIR}:${origPath}`;
});

afterEach(() => {
  process.env['PATH'] = origPath;
});
```

### Anti-Patterns to Avoid
- **Using `exec` instead of `spawn`:** `exec` buffers all output in memory; `spawn` with stdio piped supports streaming and larger outputs. Use `spawn` for all adapter invocations.
- **Storing session state in the BaseAdapter instance:** Adapters are stateless executors. Session data belongs in the session store. Mixing them breaks multi-call isolation.
- **Calling `process.exit()` in runtime code:** Runtime is a library imported by companion. Only companion may call `process.exit()`. Runtime throws typed errors.
- **Parsing JSON inside adapter `parseOutput` without try/catch:** Malformed output from CLIs must not crash the companion. Always use the safe parse utilities.
- **Hard-coding `CLAUDE_PLUGIN_DATA` path:** Always read from `process.env['CLAUDE_PLUGIN_DATA']`. Fail with a clear error if unset rather than falling back silently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation + TypeScript types | Custom JSON Schema validator | `zod` (already installed) | One source for types + validation; `.safeParse()` gives structured errors |
| CLI timeout + kill | `setTimeout` + `proc.kill()` polling | `AbortController` + `spawn({ signal })` | Composable, handles cleanup on abort correctly, verified on Node v24 |
| SHA-256 hashing | External hash library | `node:crypto` built-in | Zero dependency, already available |
| Test mocking of CLIs | Intercepting `spawn` calls in tests | Shell script shims + PATH override | No need to mock Node internals; shims are readable, maintainable, and mirror real CLI behavior |
| JSON error handling | Try/catch everywhere | Centralized `parseJSON(str): T \| null` utility | Single handling point reduces duplicated error patterns |

**Key insight:** Node.js builtins cover all infrastructure needs (crypto, fs, path, child_process). The only runtime library dependency is `zod`, and it covers both schema validation and TypeScript type generation.

## CLI Invocation Reference (VERIFIED 2026-04-04)

This section documents the verified non-interactive invocation pattern for each of the six target CLIs. Fixture shim output must match these formats.

### claude_local
- **Binary:** `claude`
- **Version installed:** 2.1.91
- **Non-interactive invocation:** `claude -p "<prompt>" --output-format json [--session-id <uuid>] [--no-session-persistence]`
- **Session resume:** `claude -p "<prompt>" --output-format json --resume <session-id>` or `--session-id <uuid>` to reuse a specific session UUID
- **Output format (json):** Single JSON object on stdout:
  ```json
  {"type":"result","subtype":"success","result":"<text>","session_id":"<uuid>","cost_usd":0.001,"duration_ms":1200}
  ```
- **Session storage:** `~/.claude/projects/<workspace-hash>/<session-id>.jsonl`
- **Session encode/decode:** `encodeSession` returns session UUID string; `decodeSession` reads UUID from stored JSON

### codex_local
- **Binary:** `codex`
- **Version installed:** 0.114.0
- **Non-interactive invocation:** `codex exec "<prompt>" --json [--ephemeral]`
- **Session resume:** `codex exec resume <session-uuid> "<prompt>" --json`
- **Output format (--json):** JSONL stream on stdout. Each line is an event:
  ```jsonl
  {"type":"message","role":"assistant","content":"<text>"}
  {"type":"done","session_id":"<uuid>"}
  ```
- **Session storage:** `~/.codex/history.jsonl` (entries have `session_id` UUID field)
- **Session encode/decode:** `encodeSession` returns session UUID; `decodeSession` reads UUID

### cursor
- **Binary:** `cursor agent`
- **Version installed:** 3.0.9
- **Headless status:** CONFIRMED. `cursor agent --print` enables full headless mode.
- **Non-interactive invocation:** `cursor agent --print "<prompt>" --output-format json [--trust] [--yolo]`
- **Session resume:** `cursor agent --print "<prompt>" --output-format json --resume <chatId>`
- **Session creation:** `cursor agent create-chat` returns a chat UUID on stdout
- **Output format (json):** JSON on stdout when `--output-format json` is used with `--print`
- **Session storage:** `~/.cursor/projects/<workspace-path>/agent-transcripts/<chat-id>.jsonl`
  - Transcript entries: `{"role":"assistant","message":"<text>"}`
- **Session encode/decode:** `encodeSession` returns chat UUID; `decodeSession` reads UUID

### gemini_local
- **Binary:** `gemini`
- **Version installed:** 0.20.0
- **Non-interactive invocation:** `gemini "<prompt>" -o json`
- **Session resume:** `gemini "<prompt>" -o json --resume <session-id>` (or `--resume latest`)
- **Output format (json):** JSON object or stream-json events on stdout
- **Session storage:** `~/.gemini/tmp/<project-hash>/chats/session-<timestamp>-<short-uuid>.json`
  - Session file format: `{"sessionId":"<uuid>","projectHash":"...","startTime":"...","lastUpdated":"...","messages":[{"id":"...","timestamp":"...","type":"user|assistant","content":"..."}]}`
- **Session encode/decode:** `encodeSession` stores `{ sessionId, projectHash }` JSON; `decodeSession` reconstructs the resume index or ID

### opencode_local
- **Binary:** `opencode`
- **Version installed:** NOT installed on this machine (only available via `npx opencode` from npm)
- **Non-interactive invocation:** `opencode run "<prompt>" --format json`
- **Session resume:** `opencode run "<prompt>" --session <session-id>` or `--continue` (last session)
- **Output format (json):** Raw JSON events stream
- **Session encode/decode:** `encodeSession` returns session ID; `decodeSession` reads session ID
- **Note:** Must test with fake shim only. Binary not locally available.

### pi_local
- **Binary:** `pi` (from `@mariozechner/pi-coding-agent`, version 0.65.0)
- **Note on oh-my-pi fork:** `@oh-my-pi/pi-coding-agent` (version 13.18.0) uses binary name `omp`, not `pi`. The original `@mariozechner/pi-coding-agent` (version 0.65.0) uses binary name `pi`. The adapter should target `pi` from badlogic/pi-mono lineage.
- **Version installed:** NOT installed on this machine
- **Non-interactive invocation:** `pi --mode print "<prompt>"` or `pi --mode json "<prompt>"`
- **Session resume:** `pi --session <session-path-or-id> "<prompt>"` or `pi -c` (continue most recent)
- **Session storage:** `~/.pi/agent/sessions/` organized by working directory, JSONL format with parent-child entries
- **Session encode/decode:** `encodeSession` stores session file path or ID; `decodeSession` reconstructs session path
- **Note:** Must test with fake shim only. Binary not locally available.

## Common Pitfalls

### Pitfall 1: Zod v3 vs v4 Version Confusion
**What goes wrong:** The latest published zod on npm is v4 (4.3.6). The project uses v3 (3.25.76, locked via `"zod": "^3"` in runtime package.json). The APIs differ — v4 changed `.safeParse()` behavior and error formats.
**Why it happens:** Running `npm install zod` without version pinning would upgrade to v4.
**How to avoid:** Always use `zod` ^3 per D-14. Do not add `zod` as a dependency elsewhere without pinning to `^3`. The `^3` range in `packages/runtime/package.json` prevents accidental v4 upgrade.
**Warning signs:** TypeScript errors mentioning `ZodIssue` changes, or `result.error.errors` structure changes.

### Pitfall 2: Child Process Not Killed on Timeout
**What goes wrong:** `clearTimeout` + `proc.kill()` sequence can miss the window if the callback fires after the process already exited; or the process spawns child processes that survive the parent kill.
**Why it happens:** Platform-specific signal propagation differences; Node.js process groups are not automatically killed.
**How to avoid:** Use `AbortController` + `spawn({ signal })`. For adapters spawning subprocesses, use `{ detached: false }` (default) and consider `process.kill(-proc.pid, 'SIGKILL')` to kill the process group on POSIX. Verified: `AbortController.abort()` sends SIGTERM by default; proc fires `error` with `code === 'ABORT_ERR'`.
**Warning signs:** Hanging test suite; zombie CLI processes in `ps aux`.

### Pitfall 3: Session File Race on First Run
**What goes wrong:** Two concurrent companion invocations for the same `(workspace, agent-id)` both check "file exists?" → both see false → both write fresh sessions → one overwrites the other.
**Why it happens:** Phase 2 is foreground-only (no background jobs yet), but still possible if user runs two terminals simultaneously.
**How to avoid:** Use `fs.writeFileSync` with the `flag: 'wx'` option (exclusive create) for the first write. If that throws `EEXIST`, read the existing file instead. Phase 3 background jobs will need a more robust lock.
**Warning signs:** Test failures where session assertions are intermittent.

### Pitfall 4: Fake Shim Shell Scripts Not Executable
**What goes wrong:** Tests fail with `EACCES` because shim files lack execute permission.
**Why it happens:** `git` does not preserve execute permissions on macOS/Linux without explicit tracking, and `fs.writeFileSync` creates files without execute bit.
**How to avoid:** Add shim files to git with `git add --chmod=+x fixtures/shims/*`, or run `chmod +x` in test `beforeAll`. Add a `beforeAll` in test helpers that calls `fs.chmodSync(shimPath, 0o755)` for all shims.
**Warning signs:** `EACCES: permission denied` in test output.

### Pitfall 5: `CLAUDE_PLUGIN_DATA` Not Set in Test Environment
**What goes wrong:** Session path tests throw `EnvMissingError` when `CLAUDE_PLUGIN_DATA` is not set.
**Why it happens:** vitest runs in the current environment without injecting the Claude Code env var.
**How to avoid:** In test setup, set `process.env['CLAUDE_PLUGIN_DATA'] = join(tmpdir(), 'agent-plugin-cc-test')` in `beforeEach` / `afterEach` with cleanup. Use `vitest`'s `vi.stubEnv` or manual assignment.
**Warning signs:** All session-related tests failing with `EnvMissingError`.

### Pitfall 6: cursor Requires `--trust` in Headless Mode
**What goes wrong:** `cursor agent --print` prompts for workspace trust dialog, blocking the process.
**Why it happens:** Cursor's security model prompts for trust on first run in a directory.
**How to avoid:** Always pass `--trust` flag when invoking cursor headless. Document this in the `CursorAdapter.buildArgs()`.
**Warning signs:** cursor process hanging on stdout read in tests (fake shim bypasses this, but real CLI will block).

### Pitfall 7: codex --json Outputs JSONL Not a Single JSON Object
**What goes wrong:** Adapter tries to `JSON.parse(stdout)` and fails because `codex exec --json` outputs multiple JSONL lines.
**Why it happens:** codex uses event-stream format, not a single JSON response like claude.
**How to avoid:** `CodexLocalAdapter.parseOutput()` must use the JSONL parser, not `JSON.parse`. Extract the last `assistant` message or the `done` event's content.
**Warning signs:** `JSON.parse` throwing `SyntaxError: Unexpected token` in adapter output parsing.

## Code Examples

### Safe JSON/JSONL Parsing (ADPT-10)
```typescript
// packages/runtime/src/process/parse.ts

export function parseJSON<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function parseJSONL<T = unknown>(raw: string): T[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => parseJSON<T>(line))
    .filter((item): item is T => item !== null);
}
```

### spawnWithTimeout Runner (ADPT-09)
```typescript
// packages/runtime/src/process/runner.ts
import { spawn } from 'node:child_process';

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export async function spawnWithTimeout(
  cmd: string,
  args: string[],
  opts: { signal?: AbortSignal; env?: NodeJS.ProcessEnv; cwd?: string }
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      signal: opts.signal,
      env: opts.env ?? process.env,
      cwd: opts.cwd,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    proc.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    proc.on('error', (err) => reject(err)); // includes ABORT_ERR
    proc.on('close', (code) => {
      resolve({
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
        exitCode: code,
      });
    });
  });
}
```

### Zod Config Validation with Field Path (CONF-02)
```typescript
// packages/runtime/src/config/loader.ts
const result = AgentsConfigSchema.safeParse(raw);
if (!result.success) {
  const firstError = result.error.errors[0];
  const fieldPath = firstError.path.join('.');
  throw new Error(`agents.json validation failed at '${fieldPath}': ${firstError.message}`);
}
```

### Session Store (SESS-01 through SESS-04)
```typescript
// packages/runtime/src/session/store.ts
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

export function loadSession(sessionPath: string): unknown | null {
  if (!existsSync(sessionPath)) return null;
  try {
    return JSON.parse(readFileSync(sessionPath, 'utf-8'));
  } catch {
    // D-09: corrupt session — delete and return null (caller logs warning)
    unlinkSync(sessionPath);
    return null;
  }
}

export function saveSession(sessionPath: string, data: unknown): void {
  mkdirSync(dirname(sessionPath), { recursive: true });
  writeFileSync(sessionPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function deleteSession(sessionPath: string): void {
  if (existsSync(sessionPath)) unlinkSync(sessionPath);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `spawn` + `setTimeout` + `proc.kill()` | `spawn({ signal: AbortController.signal })` | Node 15+ (stable in Node 18+) | Cleaner cancellation, error is typed `ABORT_ERR` |
| JSON Schema + ajv for validation | zod for validation + type inference | 2021+ | Single source of truth for schema + TS types |
| Separate type definitions + validators | zod `.infer<>` for type extraction | zod v3 (2021) | No drift between runtime validation and compile-time types |

**Deprecated/outdated:**
- `child_process.exec`: Buffers all output, 200KB default limit. Use `spawn` with piped stdio.
- `zod` v4: Project is locked to v3 (D-14). v4 has different `.safeParse()` return type and error structure.

## Open Questions

1. **pi_local binary name: `pi` vs `omp`**
   - What we know: `@mariozechner/pi-coding-agent` (v0.65.0) uses binary `pi`. The oh-my-pi fork (`@oh-my-pi/pi-coding-agent`, v13.18.0) uses binary `omp`. The PROJECT.md says `pi_local`.
   - What's unclear: Which package does the user expect? "pi_local" implies binary `pi`, which is the original badlogic lineage.
   - Recommendation: Implement `pi_local` targeting binary `pi` (badlogic/mariozechner lineage). Add `binaryName` as a configurable field in `PiLocalAdapterConfig` so users can override to `omp` if needed.

2. **cursor session ID persistence across runs**
   - What we know: `cursor agent create-chat` outputs a UUID. `cursor agent --resume <chatId>` resumes it. The transcript lives at `~/.cursor/projects/<...>/agent-transcripts/<chatId>.jsonl`.
   - What's unclear: Whether `create-chat` requires authentication and whether it works offline.
   - Recommendation: Have `CursorAdapter.encodeSession()` store the chatId and workspace path. On `--fresh`, call `create-chat` to get a new ID. On `--resume`, use the stored ID with `--resume`.

3. **gemini session resume by index vs by ID**
   - What we know: `gemini --resume <sessionId|"latest"|<index>>` per the help text.
   - What's unclear: Session ID format vs index number — which is more stable for persistence?
   - Recommendation: Store the full session UUID (not the index). Use `gemini --list-sessions` in adapter env test to confirm availability.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| `node` | All runtime code | Yes | v24.10.0 | — |
| `zod` (v3) | Config schema, adapter schemas | Yes (installed) | 3.25.76 | — |
| `vitest` | All tests | Yes (installed) | 4.1.2 | — |
| `claude` CLI | `claude_local` adapter (real use) | Yes | 2.1.91 | Fake shim for tests |
| `codex` CLI | `codex_local` adapter (real use) | Yes | 0.114.0 | Fake shim for tests |
| `cursor` CLI | `cursor` adapter (real use) | Yes | 3.0.9 | Fake shim for tests |
| `gemini` CLI | `gemini_local` adapter (real use) | Yes | 0.20.0 | Fake shim for tests |
| `opencode` CLI | `opencode_local` adapter (real use) | No | — | Fake shim for tests |
| `pi` CLI | `pi_local` adapter (real use) | No | — | Fake shim for tests |

**Missing dependencies with no fallback:** None — all missing CLIs have fake shim fallbacks.

**Missing dependencies with fallback:**
- `opencode`: not installed globally. Real invocation untested on this machine. Fake shim covers all CI test scenarios. D-11 explicitly calls out that formats must be verified; the opencode format is sourced from official docs (opencode.ai/docs/cli/).
- `pi`: not installed globally. Same situation as opencode. Format sourced from badlogic/pi-mono README.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file (plugin) | `packages/plugin/vitest.config.ts` (exists) |
| Config file (runtime) | None — needs creation as Wave 0 gap |
| Quick run command | `npm test --workspace packages/runtime` |
| Full suite command | `npm test` (runs all workspaces) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-01 | AgentsConfigSchema parses valid input; required fields present | unit | `npm test --workspace packages/runtime -- --testPathPattern config/schema` | No — Wave 0 |
| CONF-02 | `safeParse` returns field path in error message | unit | `npm test --workspace packages/runtime -- --testPathPattern config/loader` | No — Wave 0 |
| CONF-03 | Unknown adapterType is rejected | unit | (same as CONF-01) | No — Wave 0 |
| CONF-04 | Walk-up finds .claude/agents.json from subdirectory | unit | (same as CONF-02 loader test) | No — Wave 0 |
| ADPT-02 | Hook interfaces have default implementations | unit | `npm test --workspace packages/runtime -- --testPathPattern hooks` | No — Wave 0 |
| ADPT-03 | claude_local parses json output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/claude` | No — Wave 0 |
| ADPT-04 | codex_local parses JSONL output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/codex` | No — Wave 0 |
| ADPT-05 | cursor parses json output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/cursor` | No — Wave 0 |
| ADPT-06 | gemini_local parses json output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/gemini` | No — Wave 0 |
| ADPT-07 | opencode_local parses json output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/opencode` | No — Wave 0 |
| ADPT-08 | pi_local parses json output, encodes/decodes session | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/pi` | No — Wave 0 |
| ADPT-09 | spawnWithTimeout kills process and throws AdapterTimeoutError | unit | `npm test --workspace packages/runtime -- --testPathPattern process/runner` | No — Wave 0 |
| ADPT-10 | parseJSON returns null on malformed input; parseJSONL skips bad lines | unit | `npm test --workspace packages/runtime -- --testPathPattern process/parse` | No — Wave 0 |
| SESS-01 | Session file created at correct SHA-256 path after first run | unit | `npm test --workspace packages/runtime -- --testPathPattern session/store` | No — Wave 0 |
| SESS-02 | Session loaded and passed to adapter when --resume | unit | (same as SESS-01) | No — Wave 0 |
| SESS-03 | Session deleted when --fresh | unit | (same as SESS-01) | No — Wave 0 |
| SESS-04 | Different workspace roots produce different hash dirs | unit | (same as SESS-01) | No — Wave 0 |
| ERR-03 | Non-zero exit from adapter caught, companion does not crash | unit | `npm test --workspace packages/runtime -- --testPathPattern adapters/claude` (error scenario) | No — Wave 0 |
| ERR-05 | Missing CLAUDE_PLUGIN_DATA throws descriptive error | unit | (same as SESS-01 — env stub test) | No — Wave 0 |
| LOG-01 | Log entry written to correct path | unit | `npm test --workspace packages/runtime -- --testPathPattern logging` | No — Wave 0 |
| LOG-02 | Start/completion/failure events include timing | unit | (same as LOG-01) | No — Wave 0 |
| LOG-03 | emitLog hook called on each log entry | unit | (same as LOG-02 — verify hook invoked) | No — Wave 0 |
| TEST-01 | All runtime helper tests pass without real binaries | unit | `npm test --workspace packages/runtime` | No — Wave 0 |
| TEST-02 | Six adapter smoke tests pass with fake shims | smoke | `npm test --workspace packages/runtime` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test --workspace packages/runtime`
- **Per wave merge:** `npm test` (full monorepo suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/runtime/vitest.config.ts` — vitest config for runtime package
- [ ] `packages/runtime/package.json` — add `"test": "vitest run"` script and vitest devDependency
- [ ] `packages/runtime/tests/` — entire test directory tree (all test files listed above)
- [ ] `packages/runtime/tests/fixtures/shims/` — all six fake CLI shell scripts with `chmod +x`
- [ ] `packages/runtime/tests/helpers/path-override.ts` — PATH injection helper for shim tests

## Sources

### Primary (HIGH confidence)
- Verified via direct CLI execution on this machine (2026-04-04):
  - `claude --help` (v2.1.91) — flags: `-p`, `--output-format`, `--session-id`, `--resume`, `--no-session-persistence`
  - `codex exec --help` (v0.114.0) — flags: `--json`, `--ephemeral`; `codex exec resume --help`
  - `cursor agent --help` (v3.0.9) — flags: `--print`, `--output-format`, `--resume`, `--trust`
  - `gemini --help` (v0.20.0) — flags: `-o`/`--output-format`, `--resume`, `--list-sessions`
  - Node.js v24.10.0 `AbortController` + `spawn({ signal })` — verified working, emits `ABORT_ERR`
  - zod 3.25.76 `z.discriminatedUnion` + `.safeParse()` + default `.strip()` — verified working
  - `node:crypto` SHA-256 — verified output format
- Session file formats inspected directly:
  - claude: `~/.claude/projects/*/uuid.jsonl` (JSONL, each line is a typed JSON event)
  - codex: `~/.codex/history.jsonl` (entries with `session_id` UUID)
  - gemini: `~/.gemini/tmp/<project-hash>/chats/session-*.json` (JSON with `sessionId`, `messages[]`)
  - cursor: `~/.cursor/projects/*/agent-transcripts/<uuid>/uuid.jsonl` (JSONL with `role`, `message`)

### Secondary (MEDIUM confidence)
- [opencode.ai/docs/cli/](https://opencode.ai/docs/cli/) — `opencode run` flags: `--format json`, `--session`, `--continue`
- [badlogic/pi-mono README](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/README.md) — `pi` binary, `--mode print`, `--mode json`, `--session`, `-c` flags

### Tertiary (LOW confidence)
- `@mariozechner/pi-coding-agent` npm page v0.65.0 — confirms binary name is `pi`
- `@oh-my-pi/pi-coding-agent` npm page v13.18.0 — confirms binary name is `omp` (different fork)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed; versions confirmed via `cat node_modules/*/package.json`
- CLI invocation formats: HIGH for claude, codex, cursor, gemini (direct CLI inspection); MEDIUM for opencode, pi (official docs only)
- Architecture patterns: HIGH — patterns derived from Node.js built-ins and zod APIs all verified executable
- Test approach: HIGH — vitest already installed and configured; fake shim pattern is trivial and proven

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable stack; CLI flags could change on any CLI update, but shims isolate tests from that)
