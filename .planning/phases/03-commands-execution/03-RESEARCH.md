# Phase 3: Commands & Execution - Research

**Researched:** 2026-04-04
**Domain:** Node.js CLI companion, background job lifecycle, Claude Code command .md authoring, integration testing with fake CLI shims
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Companion CLI Design**
- D-01: Hand-rolled argv parser — no CLI framework dependency. Subcommand as `argv[2]`, flags via simple loop. Sufficient for 6 commands with a few flags each. Matches zero-dep philosophy.
- D-02: Single entry point with subcommand pattern: `companion setup`, `companion task --agent x`, `companion status <id>`. One file bundled with tsup. Matches the current stub in `packages/plugin/src/companion/index.ts`.
- D-03: Missing config guard — non-setup commands fail with: "No agents.json found. Run /agents:setup to configure agents." Clear, actionable, satisfies ERR-01/ERR-02.

**Background Job Architecture**
- D-04: Background jobs spawned via `child_process.fork()` with detached mode, `stdio: 'ignore'`, and `unref()`. Parent writes initial job metadata and exits immediately. Proven Node daemon pattern.
- D-05: Separate worker entry point (`worker.ts`) bundled by tsup alongside the companion. Takes job-id + config as args, runs the adapter, writes result. Clean separation from companion logic.
- D-06: Cancel sentinel polled every 1 second by the worker during adapter execution. On detection, worker kills the child process and writes `cancelled` status. Simple and reliable.

**Command File Content**
- D-07: Command `.md` files instruct Claude to run `node .claude-plugin/scripts/agents-companion.cjs <subcommand> [flags]` via Bash tool and parse the structured output. Direct and explicit invocation.
- D-08: `/agents:setup` is a guided interactive wizard — the command `.md` instructs Claude to ask the user for agent details (id, label, adapter type, description) conversationally, then calls the companion to write `agents.json`.
- D-09: Companion always outputs JSON. Command `.md` files tell Claude to parse JSON and present results in human-readable format (tables, lists). Consistent, testable, and flexible for Claude to reformat.

**Delegation Subagent**
- D-10: Claude IS the matcher — subagent `.md` file lists all agent descriptions (fetched via companion) and instructs Claude to select the best match using its own judgment. No scoring algorithm needed.
- D-11: When no agent clearly matches, subagent shows all agents with descriptions and asks the user to pick. Satisfies DELEG-03. Transparent, avoids wrong guesses.
- D-12: Subagent calls `companion list --json` to get agents rather than reading `agents.json` directly. Single source of truth — companion handles config loading, validation, formatting.

### Claude's Discretion
- Job ID generation format (UUID or similar)
- Exact JSON output schemas for each command
- Command `.md` frontmatter fields and formatting conventions
- Worker script error recovery details
- Companion exit codes for different failure modes
- Exact flag names beyond those specified in requirements (e.g., `--json` for list)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONF-05 | `/agents:setup` wizard writes valid `agents.json` to `.claude/agents.json` and validates before confirming | Companion `setup` subcommand: Claude drives conversational prompting; companion writes + validates via `AgentsConfigSchema` |
| CONF-06 | `/agents:setup` prompts for id, label, description, adapterType, and adapter-specific adapterConfig per agent | `setup.md` instructs Claude to collect fields conversationally; companion `setup` accepts structured JSON arg or interactive stdin-free approach |
| CMD-01 | `/agents:list` displays agents in table with id, label, description, adapterType | Companion `list` subcommand: loads config, outputs JSON array; `list.md` presents as markdown table |
| CMD-02 | `/agents:list` returns clear error when `agents.json` missing | `ConfigNotFoundError` from runtime `loadConfig()`; companion catches and outputs JSON error with non-zero exit |
| CMD-03 | `/agents:task --agent <id> <prompt>` foreground run, output inline | Companion `task` subcommand: instantiate adapter, call `execute()`, print JSON result; `task.md` presents output |
| CMD-04 | `/agents:task --agent <id> --background <prompt>` returns job-id immediately | `fork()` + `detach` + `unref()` pattern; companion writes metadata file, prints job-id JSON, exits |
| CMD-05 | `/agents:task` returns clear error when `--agent <id>` not found | Companion validates agent ID against loaded config before execution |
| CMD-06 | `/agents:task --agent <id> --fresh <prompt>` discards session | Call `deleteSession()` from runtime before adapter execution |
| CMD-07 | `/agents:task --agent <id> --resume <prompt>` reuses session if exists | Call `loadSession()` from runtime, pass sessionId to adapter |
| CMD-08 | `/agents:status <job-id>` reads job metadata, returns status enum | Companion `status` subcommand: reads `jobs/<job-id>.json`, outputs JSON with status field |
| CMD-09 | `/agents:status <job-id>` clear error when job-id not found | File existence check before parsing; JSON error output with non-zero exit |
| CMD-10 | `/agents:result <job-id>` reads result file, prints agent output | Companion `result` subcommand: reads `results/<job-id>` file, outputs JSON with content |
| CMD-11 | `/agents:result <job-id>` clear error when job not completed or invalid | Check job status before reading result file; error if `pending/running/failed/cancelled` |
| CMD-12 | `/agents:cancel <job-id>` sends cancellation signal, writes `cancelled` status atomically | Write sentinel file to `cancel/<job-id>`; update job metadata status atomically |
| CMD-13 | `/agents:cancel <job-id>` clear error when job not in running/pending state | Check current status before writing sentinel; JSON error with non-zero exit |
| JOB-01 | Background worker continues running after parent companion exits | `fork({detached: true, stdio: 'ignore'})` + `worker.unref()` |
| JOB-02 | Companion writes job metadata before returning job-id | `mkdirSync` + `writeFileSync` to `jobs/<job-id>.json` before fork |
| JOB-03 | Worker updates status to `running` when adapter starts | Worker updates metadata file at start of adapter execution |
| JOB-04 | Worker writes output to `results/<job-id>` and status to `completed` on success | `writeFileSync` for result; atomic metadata update |
| JOB-05 | Worker updates status to `failed`, writes error message on adapter failure | Try/catch in worker; catch writes error to metadata |
| JOB-06 | Cancel sentinel at `cancel/<job-id>`; worker polls and terminates | `setInterval(1000)` poll in worker; `existsSync` check; kill child process |
| JOB-07 | Job-id is UUID generated at dispatch time | `crypto.randomUUID()` — built-in Node 24, no external package |
| DELEG-01 | Delegation subagent reads descriptions, selects best match | `delegation.md` instructs Claude to call `companion list --json`; Claude matches semantically |
| DELEG-02 | Delegation subagent invokes exactly one companion command | `delegation.md` explicitly constrains to single invocation |
| DELEG-03 | Subagent falls back to listing agents if no clear match | `delegation.md` instructs fallback display with ask |
| ERR-01 | All six commands return non-zero exit + human-readable error when `agents.json` missing | Companion catches `ConfigNotFoundError`, outputs JSON `{error: "..."}`, exits 1 |
| ERR-02 | All six commands return non-zero exit + human-readable error on validation failure | Companion catches `ConfigValidationError` (with `fieldPath`), outputs JSON error, exits 1 |
| ERR-04 | Background worker writes error details to job metadata when adapter fails | Worker catch block writes `{status: "failed", error: err.message}` to job file |
| TEST-03 | Companion integration tests: config load+validate, foreground, background, status, result, cancel — all with fake CLIs | New test file in `packages/plugin/tests/`; reuse `__ADAPTER_TEST_MODE` shim pattern + `useShimPath()` helper |
| TEST-05 | All tests pass in CI without real AI CLI binaries | Integration tests use shim PATH override; no binary assumptions |
</phase_requirements>

---

## Summary

Phase 3 wires up the full user-facing surface of the plugin: the companion CLI (currently a stub), command `.md` files (currently empty shells), background job infrastructure, and integration tests. All building blocks exist from Phase 2 — the runtime package exports every function the companion needs (`loadConfig`, adapter classes, `loadSession`/`saveSession`/`deleteSession`, `createLogger`, `getStatePath`/`getLogPath`). The companion just orchestrates them.

The companion is a single TypeScript file at `packages/plugin/src/companion/index.ts`, bundled by tsup to `scripts/agents-companion.cjs`. Phase 3 adds a second entry point: `src/companion/worker.ts` bundled to `scripts/agents-worker.cjs`. The companion forks the worker for background jobs using Node's built-in `child_process.fork()` with `{detached: true, stdio: 'ignore'}` + `unref()`. Job state is stored as JSON files under `CLAUDE_PLUGIN_DATA/state/<hash>/jobs/`, result content under `.../results/`, cancel sentinels under `.../cancel/`.

Command `.md` files already exist as structural stubs (Phase 1 created them with frontmatter). Phase 3 replaces their minimal bodies with real Claude instructions. The delegation subagent file also exists as a stub that largely matches the final design already. Integration tests live in `packages/plugin/tests/` and reuse the exact same fake-CLI-shim pattern established in Phase 2 runtime tests.

**Primary recommendation:** Implement the companion in vertical slices — one subcommand at a time, each with its integration test — so each slice is independently testable before moving to the next.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:child_process` | Node 24 built-in | Fork background worker, spawn adapters | No external dep; `fork()` + `detached` is the canonical Node daemon pattern |
| `node:crypto` | Node 24 built-in | `randomUUID()` for job IDs | Cryptographically random; no external `uuid` package needed since Node 14.17+ |
| `node:fs` | Node 24 built-in | Read/write job metadata, result, sentinel files | Synchronous `writeFileSync`/`readFileSync` are safe for companion's single-threaded use |
| `node:path` | Node 24 built-in | Path construction for state files | Cross-platform correctness |
| `@agent-plugin-cc/runtime` | workspace `^0.1.0` | All adapters, config loading, session, logger, paths | Already implemented in Phase 2; companion is a thin orchestration layer |
| `zod` | `^3` (3.25.76 installed) | Job metadata schema validation (optional but consistent) | Already the single runtime dep; pattern is established |

### Supporting (Test Only)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `^4.1.2` (installed) | Integration test framework | All companion tests in `packages/plugin/tests/` |
| Shell shims (`.sh`/`#!/bin/sh`) | — | Fake CLI binaries for integration tests | Same pattern as Phase 2: `__ADAPTER_TEST_MODE` env var |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `crypto.randomUUID()` | `uuid` npm package | No advantage; built-in is sufficient and zero-dep |
| `fork()` for worker | `spawn('node', ['worker.cjs'])` | Fork is cleaner — IPC channel available if needed; both work for detached processes |
| Synchronous file I/O | Async (`fsPromises`) | Sync is simpler in a CLI process that immediately exits after writing; no event loop concern |

**Installation:**

No new packages needed. All dependencies are either Node built-ins or already installed:
```bash
# Nothing to install — Node 24 built-ins + workspace runtime package cover everything
```

**Version verification:** All packages verified against installed `node_modules` on 2026-04-04.

---

## Architecture Patterns

### Companion Entry Point Structure

```
packages/plugin/src/companion/
├── index.ts          # Main CLI entry: argv parse → dispatch subcommand
├── worker.ts         # Background worker: runs adapter, writes result, polls cancel
├── commands/
│   ├── setup.ts      # setup subcommand: conversational wizard via stdout/stdin not needed — Claude drives it
│   ├── list.ts       # list subcommand: load config, output JSON
│   ├── task.ts       # task subcommand: foreground or background dispatch
│   ├── status.ts     # status subcommand: read job metadata
│   ├── result.ts     # result subcommand: read result file
│   └── cancel.ts     # cancel subcommand: write sentinel, update status
└── job.ts            # Job metadata type + read/write helpers
```

### State File Layout

```
$CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>/
├── sessions/          # Phase 2 (existing)
│   └── <agent-id>.json
├── logs/              # Phase 2 (existing)
│   └── <job-id>.log
├── jobs/              # Phase 3 — NEW
│   └── <job-id>.json  # {jobId, agentId, status, startTime, pid}
├── results/           # Phase 3 — NEW
│   └── <job-id>       # raw agent output string
└── cancel/            # Phase 3 — NEW
    └── <job-id>       # sentinel file, content irrelevant
```

`getStatePath()` from the runtime already returns the base `state/<hash>/` path. The companion appends `jobs/`, `results/`, and `cancel/` subdirectories.

### Pattern 1: Companion Dispatch Table

```typescript
// Source: hand-rolled per D-01, D-02
#!/usr/bin/env node
const [,, subcommand, ...rest] = process.argv;

const commands: Record<string, (args: string[]) => Promise<void>> = {
  setup: setupCommand,
  list: listCommand,
  task: taskCommand,
  status: statusCommand,
  result: resultCommand,
  cancel: cancelCommand,
};

const handler = commands[subcommand];
if (!handler) {
  console.error(JSON.stringify({ error: `Unknown command: ${subcommand}` }));
  process.exit(1);
}

handler(rest).catch((err) => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
```

### Pattern 2: Config Guard (ERR-01, ERR-02, D-03)

```typescript
// Applied at top of every non-setup command handler
import { loadConfig, validatePluginDataDir, ConfigNotFoundError, ConfigValidationError } from '@agent-plugin-cc/runtime';

function withConfig<T>(fn: (config: AgentsConfig, dataDir: string) => Promise<T>): () => Promise<T> {
  return async () => {
    let dataDir: string;
    try {
      dataDir = validatePluginDataDir();
    } catch (err) {
      console.log(JSON.stringify({ error: (err as Error).message }));
      process.exit(1);
    }
    try {
      const config = loadConfig(process.cwd());
      return await fn(config, dataDir);
    } catch (err) {
      if (err instanceof ConfigNotFoundError) {
        console.log(JSON.stringify({ error: 'No agents.json found. Run /agents:setup to configure agents.' }));
        process.exit(1);
      }
      if (err instanceof ConfigValidationError) {
        console.log(JSON.stringify({ error: err.message }));
        process.exit(1);
      }
      throw err;
    }
  };
}
```

### Pattern 3: Background Job Fork (JOB-01, JOB-02, D-04, D-05)

```typescript
// Source: Node.js docs — child_process.fork() with detached
import { fork } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const jobId = randomUUID();
const jobsDir = join(statePath, 'jobs');
mkdirSync(jobsDir, { recursive: true });

// Write metadata BEFORE fork so status is immediately queryable (JOB-02)
const metadata: JobMetadata = {
  jobId,
  agentId,
  status: 'pending',
  startTime: new Date().toISOString(),
  pid: null,  // updated by worker once it starts
};
writeFileSync(join(jobsDir, `${jobId}.json`), JSON.stringify(metadata, null, 2));

const worker = fork(
  workerPath,           // absolute path to agents-worker.cjs
  [jobId, agentId, prompt, JSON.stringify(adapterConfig)],
  { detached: true, stdio: 'ignore' }
);
worker.unref();  // parent can exit without waiting for worker

// Return immediately
console.log(JSON.stringify({ jobId }));
```

### Pattern 4: Cancel Sentinel Polling (JOB-06, D-06)

```typescript
// Inside worker.ts — poll every 1s during adapter execution
import { existsSync } from 'node:fs';

const cancelPath = join(statePath, 'cancel', jobId);
const pollInterval = setInterval(() => {
  if (existsSync(cancelPath)) {
    clearInterval(pollInterval);
    adapterProcess.kill('SIGTERM');
    updateJobStatus(jobId, 'cancelled');
    process.exit(0);
  }
}, 1000);

// After adapter completes:
clearInterval(pollInterval);
```

### Pattern 5: Atomic Job Status Update

```typescript
// Use writeFileSync which is atomic on most OS for small files
function updateJobStatus(jobsDir: string, jobId: string, update: Partial<JobMetadata>): void {
  const path = join(jobsDir, `${jobId}.json`);
  const existing = JSON.parse(readFileSync(path, 'utf-8')) as JobMetadata;
  writeFileSync(path, JSON.stringify({ ...existing, ...update }, null, 2), 'utf-8');
}
```

### Pattern 6: Command .md File Format (D-07, D-08, D-09)

The Phase 1 stubs already establish the correct structure. Phase 3 replaces the body for commands that need Claude reasoning (setup) or richer output presentation (list, task, result):

```markdown
---
description: <human-facing description>
argument-hint: '<flags> <prompt>'
allowed-tools: Bash(node:*)
---

<Instructions for Claude to invoke companion and parse JSON output>
```

The `!` prefix (bare bash) from Phase 1 stubs is sufficient for simple pass-through commands (status, cancel). Commands where Claude must present formatted output or run a wizard need a real instruction body.

### Pattern 7: setup Command — Claude-driven Wizard (CONF-05, CONF-06, D-08)

The `setup.md` body instructs Claude to:
1. Ask user for agent details conversationally (id, label, description, adapterType, and relevant adapterConfig)
2. Assemble the JSON structure
3. Call `companion setup --config '<JSON>'` with the assembled data
4. Companion validates with `AgentsConfigSchema` and writes to `.claude/agents.json`
5. Companion returns `{success: true, path: "..."}` or `{error: "..."}`

This avoids stdin interaction in the companion (which is problematic for a non-interactive CLI context).

### Pattern 8: Delegation Subagent (DELEG-01, DELEG-02, DELEG-03, D-10, D-11, D-12)

The existing `agents/delegation.md` stub is close to final. Phase 3 updates it to:
1. Call `companion list --json` to get agent descriptions (D-12)
2. Instruct Claude to select best match using natural language reasoning (D-10)
3. Invoke exactly one `companion task` call (DELEG-02)
4. Fall back to listing all agents and asking user when no clear match (D-11, DELEG-03)

### tsup Entry Point Addition (D-05)

```typescript
// packages/plugin/tsup.config.ts — add worker entry
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'agents-companion': 'src/companion/index.ts',
    'agents-worker': 'src/companion/worker.ts',   // NEW in Phase 3
  },
  format: ['cjs'],
  outDir: 'scripts',
  outExtension: () => ({ js: '.cjs' }),
  splitting: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  noExternal: [/.*/],
});
```

### Anti-Patterns to Avoid

- **Reading `agents.json` directly in the delegation subagent:** Use `companion list --json` instead (D-12). Direct reads bypass validation.
- **Spawning worker with `spawn('node', ['worker.cjs', ...]):`** Use `fork()` — it's designed for this and allows future IPC if needed. Both work but fork is the established Node daemon pattern.
- **Polling cancel sentinel in the companion (parent):** Sentinel polling belongs in the worker. The companion exits immediately after returning the job-id.
- **stdout mixing in worker:** Worker must write JSON job metadata to files only; all stdout is inherited from companion which has already exited. Worker should use the logger (writes to log file) not stdout.
- **Race on job metadata:** Write metadata file completely before calling `fork()`. The worker should update `pid` and `status: 'running'` fields after it starts.
- **Using async file I/O in the companion (parent):** Synchronous `writeFileSync` is correct here — the companion is a short-lived CLI process, not a server.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config loading + validation | Custom JSON reader | `loadConfig()` from `@agent-plugin-cc/runtime` | Already handles walk-up, parse, Zod validation, typed errors |
| UUID generation | Custom random string | `crypto.randomUUID()` | Built-in since Node 14.17; cryptographically random; no external dep |
| Session persistence | Custom file store | `loadSession`/`saveSession`/`deleteSession` from runtime | Already implemented with hash partitioning and corrupt-file handling |
| Structured logging | Custom log writer | `createLogger()` from runtime | Already writes JSONL with timestamps, level, jobId, durationMs |
| Path construction | Custom path strings | `getStatePath()` + manual join for `jobs/`, `results/`, `cancel/` | `getStatePath()` provides the hash-partitioned base; always join from it |
| Adapter instantiation | Switch/case in companion | Factory function mapping `adapterType` to adapter class | Six adapter classes already exported from runtime |
| Timeout handling | Custom setTimeout | `spawnWithTimeout()` from runtime | Already handles AbortController, error typing |

**Key insight:** The companion is a thin CLI orchestration layer. Every substantive operation is already implemented in `@agent-plugin-cc/runtime`. The companion's job is: parse argv → call runtime functions → serialize results to JSON stdout → exit.

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a greenfield implementation phase, not a rename/refactor/migration phase. No existing runtime state to inventory.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Companion CLI, worker | Yes | v24.10.0 | — |
| pnpm | Build, test | Yes | 10.18.0 | — |
| `@agent-plugin-cc/runtime` | Companion imports | Yes (workspace dep, built) | 0.1.0 | — |
| vitest | Integration tests | Yes (root devDep, hoisted) | 4.1.2 | — |
| tsup | Companion bundle | Yes (plugin devDep) | 8.5.1 | — |
| `node:crypto.randomUUID` | JOB-07 | Yes (Node 14.17+) | built-in | — |
| `node:child_process.fork` | JOB-01, D-04 | Yes | built-in | — |
| Shell shims (`#!/bin/sh`) | TEST-03, TEST-05 | Yes (macOS/Linux) | system sh | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Common Pitfalls

### Pitfall 1: Worker Inherits Parent's Open File Descriptors

**What goes wrong:** If `stdio` is not `'ignore'` on the fork call, the worker inherits the parent's stdout/stderr. The parent process will not exit until the worker closes those descriptors, defeating the background job design.
**Why it happens:** `fork()` default `stdio` is `'pipe'` which creates IPC + inherits stdio unless overridden.
**How to avoid:** Always `fork(workerPath, args, { detached: true, stdio: 'ignore' })` — explicit `stdio: 'ignore'` is mandatory.
**Warning signs:** Parent companion hangs instead of returning job-id immediately in background mode.

### Pitfall 2: Job Metadata Written After Fork

**What goes wrong:** If the companion writes job metadata after calling `fork()`, a fast `/agents:status` call from Claude may race and find no job file, returning a spurious "job not found" error.
**Why it happens:** `fork()` is non-blocking; the metadata write and fork are concurrent from the OS perspective.
**How to avoid:** Always write the complete job metadata file (`writeFileSync`) **before** the `fork()` call. Worker updates `pid` and `status: 'running'` fields — the initial write is the companion's responsibility.
**Warning signs:** Flaky `status` tests that sometimes return 404 immediately after `task --background`.

### Pitfall 3: Worker stdout Pollution

**What goes wrong:** Worker code that calls `console.log()` has nowhere to write (stdio is ignored). Any accidental `process.stdout.write()` in the worker is silently discarded. Debug output via console.log will never appear.
**Why it happens:** `stdio: 'ignore'` disconnects all standard streams.
**How to avoid:** Worker must use `createLogger()` for all diagnostic output. Never use `console.log` in worker.ts. Tests should assert on file state (job metadata, result files), not stdout.
**Warning signs:** Missing output during debugging; false test passes because console.log silently fails.

### Pitfall 4: Cancel Sentinel Race With Completion

**What goes wrong:** Worker checks sentinel, adapter finishes, worker writes `completed` status. Then sentinel is detected in the same poll interval. Result: status is `cancelled` but result file exists with valid output.
**Why it happens:** Async poll and adapter completion are concurrent.
**How to avoid:** Worker clears the poll interval immediately when adapter's `execute()` resolves/rejects. Status update to `completed`/`failed` happens in the same synchronous block that clears the interval. Use a `cancelled` flag variable to guard the status write.
**Warning signs:** Integration test for `cancel` sometimes produces `completed` status.

### Pitfall 5: Companion Imports Relative to Bundle vs. Source

**What goes wrong:** The companion references worker path as relative to `__dirname`. In the tsup CJS bundle, `__dirname` is the `scripts/` directory. In the source TypeScript, `__dirname` would be `src/companion/`. Hardcoding either breaks the other.
**Why it happens:** tsup bundles both files; `__dirname` resolves correctly at runtime in the bundle.
**How to avoid:** Worker path should always be `join(__dirname, 'agents-worker.cjs')` — this works correctly in the bundle because tsup places both files in `scripts/`. Never use `../dist/worker.js` or similar source-relative paths.
**Warning signs:** `ENOENT` error when fork attempts to load worker in production (post-bundle) but works in source mode.

### Pitfall 6: setup Command Collecting adapterConfig

**What goes wrong:** `adapterConfig` shape varies per adapterType (e.g., `claude_local` needs `model`, `maxBudgetUsd`; `codex_local` needs `provider`, `model`). A generic "any key=value" approach creates invalid configs.
**Why it happens:** The AdapterConfigSchema is a discriminated union — invalid shapes fail validation.
**How to avoid:** The `setup.md` Claude instructions must enumerate per-adapter optional fields by adapter type. Claude asks only relevant fields based on the selected adapterType. The companion `setup` subcommand validates the assembled JSON with `AgentsConfigSchema.safeParse()` before writing.
**Warning signs:** `agents.json` written with wrong discriminant field rejected by `loadConfig()` on next command.

### Pitfall 7: Test Isolation for Background Job Tests

**What goes wrong:** Integration tests for background jobs that write to `CLAUDE_PLUGIN_DATA` leave state files behind, causing subsequent test runs to see stale job files.
**Why it happens:** Background job state is filesystem-based; tests don't clean up.
**How to avoid:** Each test uses a unique temp dir for `CLAUDE_PLUGIN_DATA` (e.g., `os.tmpdir() + '/' + randomUUID()`). Use vitest `afterEach` to remove the temp dir with `rmSync(dir, { recursive: true, force: true })`.
**Warning signs:** Tests pass in isolation but fail when run together; `status` tests see old job IDs.

---

## Code Examples

### Adapter Factory

```typescript
// Source: types established in @agent-plugin-cc/runtime
import {
  ClaudeLocalAdapter, CodexLocalAdapter, CursorAdapter,
  GeminiLocalAdapter, OpencodeLocalAdapter, PiLocalAdapter,
} from '@agent-plugin-cc/runtime';
import type { AgentConfig, BaseAdapter } from '@agent-plugin-cc/runtime';

function createAdapter(agent: AgentConfig): BaseAdapter {
  switch (agent.adapterType) {
    case 'claude_local':   return new ClaudeLocalAdapter();
    case 'codex_local':    return new CodexLocalAdapter();
    case 'cursor':         return new CursorAdapter();
    case 'gemini_local':   return new GeminiLocalAdapter();
    case 'opencode_local': return new OpencodeLocalAdapter();
    case 'pi_local':       return new PiLocalAdapter();
  }
}
```

### Job Metadata Type

```typescript
// New type defined in companion/job.ts — not in runtime (job concept is companion-only)
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobMetadata {
  jobId: string;
  agentId: string;
  status: JobStatus;
  startTime: string;        // ISO timestamp
  endTime?: string;         // ISO timestamp set on terminal state
  pid: number | null;       // null until worker updates it
  error?: string;           // set on 'failed' status (ERR-04)
}
```

### Integration Test Pattern (TEST-03, TEST-05)

```typescript
// packages/plugin/tests/companion.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

// Reuse the established shim pattern from Phase 2
const SHIMS_DIR = join(__dirname, '..', '..', 'runtime', 'tests', 'fixtures', 'shims');
const COMPANION = join(__dirname, '..', 'scripts', 'agents-companion.cjs');

function runCompanion(args: string, env: NodeJS.ProcessEnv): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${COMPANION}" ${args}`, {
      env: { ...process.env, ...env },
      encoding: 'utf-8',
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return { stdout: err.stdout ?? '', exitCode: err.status ?? 1 };
  }
}

describe('companion integration', () => {
  let dataDir: string;
  let workspaceDir: string;
  let shimPath: string;

  beforeEach(() => {
    dataDir = join(tmpdir(), randomUUID());
    workspaceDir = join(tmpdir(), randomUUID());
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(join(workspaceDir, '.claude'), { recursive: true });
    shimPath = `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`;

    // Write a valid agents.json
    writeFileSync(
      join(workspaceDir, '.claude', 'agents.json'),
      JSON.stringify({ agents: [{ id: 'test', label: 'Test', description: 'A test agent', adapterType: 'claude_local' }] }),
    );
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  it('list returns agents JSON', () => {
    const { stdout, exitCode } = runCompanion('list --json', {
      CLAUDE_PLUGIN_DATA: dataDir,
      PATH: shimPath,
    });
    // Note: execSync cwd defaults to process.cwd(); set cwd to workspaceDir
    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.agents).toHaveLength(1);
  });
});
```

### command .md Body for list (D-09)

```markdown
---
description: List configured local AI agents
argument-hint: ""
allowed-tools: Bash(node:*)
---

Run:
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" list --json
```

Parse the JSON response and display agents in a markdown table with columns: ID, Label, Description, Adapter Type.
If `error` is present in the response, display it as an error message.
```

### command .md Body for setup (D-08, CONF-05, CONF-06)

```markdown
---
description: Configure local AI agents for this workspace
argument-hint: ""
allowed-tools: Bash(node:*)
---

Guide the user through adding agents to `.claude/agents.json`:

1. Ask: "What would you like to name this agent?" (becomes `id` and `label`)
2. Ask: "What does this agent do?" (becomes `description`)  
3. Ask: "Which adapter type?" — present options: claude_local, codex_local, cursor, gemini_local, opencode_local, pi_local
4. Based on adapter type, ask for relevant optional config (e.g., `model` for all; `maxBudgetUsd` for claude_local; `provider` for codex_local)
5. Ask: "Add another agent? (y/n)"
6. Once done, call:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" setup --config '<JSON>'`
   where `<JSON>` is the complete agents config object.
7. Parse the response. On success, confirm with the written path. On error, show the error.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External `uuid` package | `crypto.randomUUID()` | Node 14.17 (2021) | No external dep for UUIDs |
| `child_process.spawn()` for daemons | `fork()` with `detached` + `unref()` | Always valid Node pattern | Clean separation, potential IPC |
| Poll files with `setTimeout` loops | Same — still appropriate for cancel sentinel | — | Simple and reliable for 1s polling |
| `readline` for interactive CLIs | Not needed — Claude drives the conversation | Phase 3 design decision | Zero complexity; Claude handles interactivity |

**Deprecated/outdated:**
- `async_hooks` for context propagation: Not needed; single-threaded companion with synchronous I/O.
- `cluster` module for worker management: Overkill; `fork()` + file-based state is the correct pattern for background job CLIs.

---

## Open Questions

1. **execSync cwd for integration tests**
   - What we know: `execSync` cwd defaults to `process.cwd()`. Integration tests need companion to find `agents.json` in the test workspace dir.
   - What's unclear: Whether to set `cwd: workspaceDir` in execSync options or pass `--workspace` flag to companion.
   - Recommendation: Pass `cwd: workspaceDir` to `execSync` options — simpler than adding a flag; `findConfigPath(process.cwd())` in the companion naturally walks up from cwd.

2. **setup subcommand: --config flag format**
   - What we know: D-08 says Claude assembles config and calls companion. The exact flag is discretionary.
   - What's unclear: Whether to pass full `AgentsConfig` JSON or just the new agent entry.
   - Recommendation: `companion setup --config '<full AgentsConfig JSON>'` — companion can merge with existing agents.json or create fresh, always validates before writing.

3. **`list --json` flag vs default JSON output**
   - What we know: D-09 says companion always outputs JSON. D-12 references `companion list --json`.
   - What's unclear: Whether `--json` is a flag or JSON is always the default.
   - Recommendation: Always output JSON (D-09 is clear). `--json` flag is a no-op for compatibility, not required. Command `.md` files tell Claude to parse JSON output.

4. **Worker resolving workspaceRoot**
   - What we know: Worker needs to construct state paths. `getStatePath()` requires both `pluginDataDir` and `workspaceRoot`.
   - What's unclear: How worker discovers workspaceRoot — it doesn't have `process.cwd()` context after parent exits.
   - Recommendation: Companion passes `workspaceRoot` (= `process.cwd()` at dispatch time, or the discovered config root directory) as a CLI argument to the worker alongside `jobId`, `agentId`, `prompt`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `packages/plugin/vitest.config.ts` (exists: `include: ['tests/**/*.test.ts']`) |
| Quick run command | `pnpm --filter agent-plugin-cc test` |
| Full suite command | `pnpm test` (root vitest runs all packages) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONF-05 | `setup --config` writes valid agents.json | integration | `pnpm --filter agent-plugin-cc test -- --grep "setup"` | No — Wave 0 |
| CONF-06 | setup accepts all required fields | integration | included in CONF-05 test | No — Wave 0 |
| CMD-01 | `list --json` returns agents array | integration | `pnpm --filter agent-plugin-cc test -- --grep "list"` | No — Wave 0 |
| CMD-02 | `list` returns error without agents.json | integration | included in CMD-01 test | No — Wave 0 |
| CMD-03 | `task --agent <id> <prompt>` foreground output | integration | `pnpm --filter agent-plugin-cc test -- --grep "task foreground"` | No — Wave 0 |
| CMD-04 | `task --background` returns job-id immediately | integration | `pnpm --filter agent-plugin-cc test -- --grep "background"` | No — Wave 0 |
| CMD-05 | `task` error when agent-id not found | integration | included in CMD-03 test | No — Wave 0 |
| CMD-06 | `--fresh` discards session | integration | `pnpm --filter agent-plugin-cc test -- --grep "fresh"` | No — Wave 0 |
| CMD-07 | `--resume` reuses session | integration | `pnpm --filter agent-plugin-cc test -- --grep "resume"` | No — Wave 0 |
| CMD-08 | `status <job-id>` returns status enum | integration | `pnpm --filter agent-plugin-cc test -- --grep "status"` | No — Wave 0 |
| CMD-09 | `status` error on unknown job-id | integration | included in CMD-08 test | No — Wave 0 |
| CMD-10 | `result <job-id>` returns output | integration | `pnpm --filter agent-plugin-cc test -- --grep "result"` | No — Wave 0 |
| CMD-11 | `result` error on non-completed job | integration | included in CMD-10 test | No — Wave 0 |
| CMD-12 | `cancel <job-id>` terminates worker | integration | `pnpm --filter agent-plugin-cc test -- --grep "cancel"` | No — Wave 0 |
| CMD-13 | `cancel` error on non-running job | integration | included in CMD-12 test | No — Wave 0 |
| JOB-01–07 | Full background job lifecycle | integration | `pnpm --filter agent-plugin-cc test -- --grep "job lifecycle"` | No — Wave 0 |
| ERR-01 | Non-zero exit + error JSON on missing agents.json | integration | included in CMD-02 test | No — Wave 0 |
| ERR-02 | Non-zero exit + error JSON on invalid agents.json | integration | included in all command tests | No — Wave 0 |
| ERR-04 | Worker writes error details to job metadata on failure | integration | included in JOB-05 test | No — Wave 0 |
| TEST-03 | Full lifecycle test with fake CLIs | integration | `pnpm --filter agent-plugin-cc test` | No — Wave 0 |
| TEST-05 | All tests pass without real binaries | integration | `pnpm test` (CI) | No — Wave 0 (shims reuse) |

### Sampling Rate

- **Per task commit:** `pnpm --filter agent-plugin-cc test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/plugin/tests/companion.test.ts` — covers CMD-01 through CMD-13, JOB-01 through JOB-07, ERR-01, ERR-02, ERR-04, TEST-03, TEST-05
- [ ] `packages/plugin/tests/helpers/run-companion.ts` — shared execSync helper with cwd, PATH, env setup
- [ ] Framework install: Already installed (vitest 4.1.2, no action needed)
- [ ] Shim files: Reuse from `packages/runtime/tests/fixtures/shims/` — no new shims needed for companion tests

---

## Sources

### Primary (HIGH confidence)

- Node.js 24 docs — `child_process.fork()`, `process.unref()`, `crypto.randomUUID()`, `fs.writeFileSync` — verified by direct runtime testing on Node v24.10.0
- `/Users/patryk/Projects/agent-plugin-cc/packages/runtime/src/` — all exported APIs confirmed by reading source directly
- `/Users/patryk/Projects/agent-plugin-cc/packages/runtime/tests/` — fake CLI shim pattern verified by reading test helpers and fixture files
- `/Users/patryk/Projects/agent-plugin-cc/packages/plugin/` — command .md stubs, agents/delegation.md, tsup config, vitest config all read directly

### Secondary (MEDIUM confidence)

- `.planning/phases/03-commands-execution/03-CONTEXT.md` — locked design decisions confirmed by reading directly
- Worktree at `.claude/worktrees/agent-a7ea3c5e/packages/plugin/` — prior command file content used for reference; confirmed these are consistent with Phase 1 plan

### Tertiary (LOW confidence)

- None — all findings are based on direct source code inspection and Node.js built-in verification.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against installed node_modules; Node built-ins confirmed with live execution
- Architecture: HIGH — based on direct source code reading; no speculation
- Pitfalls: HIGH — derived from reading actual implementation patterns in existing code and known Node.js subprocess semantics

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable Node.js APIs; no fast-moving dependencies in scope)
