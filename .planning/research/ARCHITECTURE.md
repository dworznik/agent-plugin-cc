# Architecture Research

**Domain:** Claude Code Plugin — Local AI Agent Orchestrator
**Researched:** 2026-04-04
**Confidence:** HIGH (architecture derived directly from explicit project requirements and known `codex-plugin-cc` reference pattern)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     Claude Code (Host)                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │/agents:    │  │/agents:    │  │/agents:    │  │/agents:   │  │
│  │  setup     │  │  task      │  │  status    │  │  cancel   │  │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│        │               │               │               │         │
│  ┌─────▼───────────────▼───────────────▼───────────────▼──────┐  │
│  │              Delegation Subagent (agents/delegate.md)       │  │
│  │         Reads agents.json → picks best agent → calls        │  │
│  │         exactly one companion command                        │  │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │ spawns
┌─────────────────────────────▼────────────────────────────────────┐
│                    Companion Script (Node.js)                     │
│                    scripts/companion.js                           │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │Config Loader│  │ Session Mgr  │  │   Job State Manager   │   │
│  │.claude/     │  │PLUGIN_DATA/  │  │ PLUGIN_DATA/state/    │   │
│  │agents.json  │  │state/<hash>/ │  │ <hash>/jobs/<id>.json │   │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬───────────┘   │
│         │                │                       │               │
│  ┌──────▼────────────────▼───────────────────────▼───────────┐   │
│  │                   Adapter Runtime Core                      │   │
│  │              packages/agents-runtime (extracted)            │   │
│  │                                                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │claude_   │ │codex_    │ │gemini_   │ │opencode_     │  │   │
│  │  │local     │ │local     │ │local     │ │local         │  │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘  │   │
│  └───────┼────────────┼────────────┼──────────────┼───────────┘   │
└──────────┼────────────┼────────────┼──────────────┼───────────────┘
           │            │            │              │
           ▼            ▼            ▼              ▼
      claude CLI    codex CLI   gemini CLI    opencode CLI
     (local binary)(local binary)(local binary)(local binary)
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Slash Commands | Entry points for all user interactions; parse args, delegate to subagent or companion | `.claude-plugin/commands/*.md` (prompt files) |
| Delegation Subagent | Reads `agents.json`, selects best agent by `description` match, invokes one companion command | `.claude-plugin/agents/delegate.md` |
| Companion Script | Locates workspace root, loads/validates config, dispatches to adapter, manages foreground/background execution | `scripts/companion.js` (Node.js) |
| Config Loader | Reads `.claude/agents.json`, validates against JSON Schema, resolves workspace root | Inside companion |
| Session Manager | Persists conversation history per `(workspace-hash, agent-id)`; supports `--fresh` / `--resume` flags | Inside companion, reads/writes `PLUGIN_DATA/state/<hash>/sessions/` |
| Job State Manager | Creates job records on background spawn, updates status/result on completion, enables cancel bookkeeping | Inside companion, writes `PLUGIN_DATA/state/<hash>/jobs/<id>.json` |
| Adapter Runtime Core | Pure execution primitives: child-process runner, prompt builder, output parser, session codec per adapter type | `packages/agents-runtime` (extracted, publishable) |
| Per-Adapter Modules | Adapter-specific CLI invocation, flag mapping, output parsing (JSONL/plain text), session file format | One module per adapter type in runtime package |

---

## Recommended Package Structure

```
agent-plugin-cc/
├── .claude-plugin/                  # Claude Code plugin manifest
│   ├── marketplace.json             # Plugin registry metadata
│   ├── plugin.json                  # Entry point declarations
│   ├── commands/                    # Slash command prompt files
│   │   ├── setup.md                 # /agents:setup
│   │   ├── list.md                  # /agents:list
│   │   ├── task.md                  # /agents:task
│   │   ├── status.md                # /agents:status
│   │   ├── result.md                # /agents:result
│   │   └── cancel.md                # /agents:cancel
│   └── agents/
│       └── delegate.md              # Thin delegation subagent
├── scripts/
│   ├── companion.js                 # Main companion entry point
│   └── worker.js                    # Detached background worker
├── packages/
│   └── agents-runtime/              # Extracted, publishable runtime
│       ├── package.json
│       ├── src/
│       │   ├── types.ts             # Shared types (AgentConfig, JobRecord, SessionData)
│       │   ├── runner.ts            # Child-process execution wrapper
│       │   ├── session.ts           # Session encode/decode (generic)
│       │   ├── prompt.ts            # Prompt building helpers
│       │   ├── parse.ts             # JSON/JSONL/plaintext output parsers
│       │   ├── timeout.ts           # Timeout + cancellation primitives
│       │   └── adapters/
│       │       ├── claude_local.ts
│       │       ├── codex_local.ts
│       │       ├── cursor.ts
│       │       ├── gemini_local.ts
│       │       ├── opencode_local.ts
│       │       └── pi_local.ts
│       └── test/
│           ├── fixtures/            # Fake CLI outputs per adapter
│           └── adapters/            # Per-adapter smoke tests
├── test/
│   ├── companion/                   # Config load, session, job lifecycle tests
│   └── plugin-layout/               # Validates .claude-plugin/ structure
├── .claude/
│   └── agents.json                  # Repo-local agent configuration
└── package.json
```

### Structure Rationale

- **`.claude-plugin/`:** Follows Claude Code plugin spec exactly — same layout as `codex-plugin-cc` reference. Keeps plugin surface (prompts, manifests) separate from runtime code.
- **`packages/agents-runtime/`:** Isolated publishable package enforces the zero-Paperclip-dependency constraint at the package boundary. Cannot accidentally import from Paperclip if it's a separate `package.json` with no Paperclip in `dependencies`.
- **`scripts/`:** Companion lives outside the runtime package because it's an executable entry point, not a library. Keeps the runtime pure and testable without side effects.
- **`test/`:** Top-level companion tests are separate from runtime unit tests because they exercise the full companion lifecycle (config → session → job), not just isolated utilities.

---

## Architectural Patterns

### Pattern 1: Strategy Pattern for Adapters

**What:** Each adapter type is a module that implements a common `AdapterStrategy` interface. The companion selects the right strategy at runtime based on `adapterType` from config.

**When to use:** Always — this is the core extensibility seam. Adding a v2 adapter means adding one new module, not modifying existing code.

**Trade-offs:** Slight indirection; pays off immediately because six adapters exist already and v2 will add more.

**Example:**
```typescript
// packages/agents-runtime/src/types.ts
export interface AdapterStrategy {
  buildCommand(prompt: string, config: AdapterConfig, session: SessionData | null): string[];
  parseOutput(raw: string): AdapterResult;
  encodeSession(history: Message[]): SessionData;
  decodeSession(data: SessionData): Message[];
}

// packages/agents-runtime/src/adapters/claude_local.ts
export const claudeLocalAdapter: AdapterStrategy = {
  buildCommand(prompt, config, session) {
    const args = ['claude', '--print', prompt];
    if (session) args.push('--resume', session.resumeToken);
    return args;
  },
  parseOutput(raw) { /* parse Claude's JSONL output */ },
  encodeSession(history) { /* serialize for disk */ },
  decodeSession(data) { /* deserialize from disk */ },
};
```

### Pattern 2: Disk-as-Source-of-Truth for Job State

**What:** All mutable job state (status, result, logs, cancel flag) lives in JSON files under `PLUGIN_DATA/state/<workspace-hash>/jobs/<job-id>.json`. Claude's context window is never the authoritative store.

**When to use:** Always for any state that must survive context resets, long-running tasks, or session boundaries.

**Trade-offs:** Slightly more I/O than in-memory; necessary because Claude context windows are ephemeral and reset unpredictably.

**Example:**
```typescript
// scripts/companion.js
interface JobRecord {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  resultPath?: string;   // path to result file when done
  error?: string;
}

async function updateJobStatus(jobId: string, update: Partial<JobRecord>) {
  const path = jobPath(jobId);
  const record = await readJson<JobRecord>(path);
  await writeJson(path, { ...record, ...update, updatedAt: new Date().toISOString() });
}
```

### Pattern 3: Detached Worker Process for Background Jobs

**What:** Background mode spawns `worker.js` as a detached child process with `stdio: 'ignore'` and `detached: true`, then calls `child.unref()` so the companion exits immediately while the worker runs independently.

**When to use:** `/agents:task --background` — any task where the user doesn't want to block the Claude session.

**Trade-offs:** Worker must write its own state to disk because it has no IPC channel back to Claude. Progress is polled via `/agents:status`, not pushed.

**Example:**
```typescript
// scripts/companion.js — background spawn
const worker = spawn(process.execPath, ['scripts/worker.js', '--job-id', jobId], {
  detached: true,
  stdio: 'ignore',
  env: { ...process.env, AGENTS_JOB_ID: jobId, AGENTS_STATE_DIR: stateDir },
});
worker.unref(); // companion can exit; worker continues

// scripts/worker.js — runs independently
await updateJobStatus(jobId, { status: 'running' });
const result = await runAdapter(jobConfig);
await writeResult(jobId, result);
await updateJobStatus(jobId, { status: 'done', resultPath: resultFile });
```

### Pattern 4: Workspace-Scoped Session Keys

**What:** Sessions are keyed by `sha256(workspaceRoot)[:8] + '-' + agentId`. The hash is computed from the absolute workspace root path, not the repo name or any mutable identifier.

**When to use:** Every session read/write — guarantees no cross-repo session bleed.

**Trade-offs:** Users cannot share sessions across repos (by design). Hash must be recomputed consistently — use the same algorithm everywhere.

**Example:**
```typescript
function workspaceHash(root: string): string {
  return createHash('sha256').update(root).digest('hex').slice(0, 8);
}

function sessionPath(stateDir: string, workspaceRoot: string, agentId: string): string {
  return path.join(stateDir, workspaceHash(workspaceRoot), 'sessions', `${agentId}.json`);
}
```

---

## Data Flow

### Foreground Task Flow

```
User: /agents:task "refactor auth module"
    ↓
Delegation Subagent
  reads .claude/agents.json
  picks agent by description match
  calls: node scripts/companion.js --agent=claude_local --task="..." --foreground
    ↓
Companion Script
  loads + validates agents.json
  reads session (if --resume)
  selects AdapterStrategy for claude_local
  builds CLI command: ['claude', '--print', '...', '--resume', token]
    ↓
child_process.spawnSync(command)
    ↓
CLI executes → stdout captured
    ↓
Companion
  parseOutput(stdout) → AdapterResult
  encodeSession(history) → writes session file
  prints result to stdout
    ↓
Claude Code captures companion stdout → displays to user
```

### Background Task Flow

```
User: /agents:task "rewrite tests" --background
    ↓
Companion Script
  generates job-id (uuid)
  writes job record: { status: 'pending', ... }
  spawns detached worker.js with job-id
  worker.unref()
  prints: "Job started: <job-id>"
    ↓ (companion exits)
    ↓ (worker continues independently)
Worker Process
  updates job: { status: 'running' }
  runs adapter → streams to temp log file
  writes result file
  updates job: { status: 'done', resultPath: '...' }
    ↓ (worker exits)

User: /agents:status <job-id>
    ↓
Companion Script (new invocation)
  reads job record from disk
  prints status JSON
    ↓
User: /agents:result <job-id>
    ↓
Companion Script
  reads result file from disk
  prints full output
```

### Cancel Flow

```
User: /agents:cancel <job-id>
    ↓
Companion Script
  reads job record → gets worker PID (if stored)
  writes cancel flag file: PLUGIN_DATA/state/<hash>/cancel/<job-id>
  if PID known: process.kill(pid, 'SIGTERM')
  updates job: { status: 'cancelled' }

Worker (if still running)
  checks cancel flag on each progress tick
  exits early if flag present
```

---

## Scaling Considerations

This is a local developer tool with a single user per machine. Scaling in the traditional sense doesn't apply. What matters instead:

| Concern | Approach |
|---------|----------|
| Many concurrent background jobs | Each job is an independent OS process; OS handles concurrency. No internal queue needed in v1. |
| Large output files | Write results to individual files, not into the job record JSON. Job record stays small. |
| Many workspaces on one machine | Each workspace gets its own hash-prefixed directory under `PLUGIN_DATA`. No contention. |
| Long-running adapters (hours) | Worker process is fully detached; survives terminal close and context resets. Timeout is per-adapter config. |
| Plugin state on slow disks | All state ops are small JSON files; no DB, no index. Disk latency is acceptable for this use case. |

---

## Anti-Patterns

### Anti-Pattern 1: Storing Job State in Claude Context

**What people do:** Keep job status in Claude's conversation as "Job abc123 is running..." and rely on Claude's memory for status queries.

**Why it's wrong:** Claude context resets between sessions, can be summarized/truncated, and has no reliable state API. Users lose track of long-running jobs after context resets.

**Do this instead:** Write every state transition to `PLUGIN_DATA/state/<hash>/jobs/<id>.json`. The companion is always invoked fresh — it reads disk, never assumes Claude remembers.

### Anti-Pattern 2: One Giant Companion Script with Inline Adapter Logic

**What people do:** Put `if (adapterType === 'claude_local') { ... } else if (adapterType === 'codex_local') { ... }` directly in the companion script.

**Why it's wrong:** Adding a new adapter requires modifying the companion. The companion becomes a 1000-line file. Testing individual adapters requires running the full companion.

**Do this instead:** Extract each adapter as a module in `agents-runtime`. Companion only imports `getAdapter(adapterType)` and calls the strategy interface. New adapters are additive, not modifications.

### Anti-Pattern 3: Importing from Paperclip Packages

**What people do:** `import { buildEnv } from '@paperclip/host-plugin'` because it's convenient and already available in the monorepo.

**Why it's wrong:** Creates a hard dependency that defeats the plugin's entire purpose. Any consumer repo without Paperclip installed will fail at import time.

**Do this instead:** Enforce zero Paperclip imports at the `package.json` boundary — `agents-runtime` and the plugin package have no Paperclip packages in `dependencies`. Add a lint rule or CI check to enforce this.

### Anti-Pattern 4: Synchronous File I/O in the Companion

**What people do:** Use `fs.readFileSync`/`fs.writeFileSync` throughout the companion because it's simpler.

**Why it's wrong:** Background workers run concurrently. Synchronous I/O in a tight polling loop can block the event loop and cause races on the job state file.

**Do this instead:** Use `fs.promises` (async) for all state reads/writes. For job record updates, use atomic write (write to `.tmp`, then `rename`) to avoid torn reads.

### Anti-Pattern 5: Global Session State

**What people do:** Store session data in a top-level `~/.agents/sessions/` directory shared across all repos.

**Why it's wrong:** Session from repo A leaks into repo B. A `--fresh` in one repo silently affects another. Debugging becomes impossible.

**Do this instead:** Always key sessions by `(workspace-hash, agent-id)`. The workspace hash is computed from the absolute path of the repo root, making it unique per checkout.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Constraint |
|----------|---------------|------------|
| Claude Code → Slash Commands | Claude Code invokes command prompt files; no direct API | Command files are markdown prompt templates — stateless |
| Slash Command → Companion | Delegation subagent runs `node scripts/companion.js <args>` via Bash | Arguments only; no shared memory |
| Companion → Worker | `child_process.spawn(..., { detached: true })` + `unref()` | One-way spawn; worker reads job config from disk, not from parent |
| Worker → Job State | Worker writes JSON files to `PLUGIN_DATA/state/` | No IPC; polling model for status queries |
| Companion → Adapter Runtime | Import `getAdapter(type)` from `agents-runtime` | Package boundary; no dynamic requires from Paperclip |
| Adapter Runtime → CLI | `child_process.spawn` with adapter-specific args | stdin/stdout/stderr only; no SDK imports from target CLI |

### Config Integration

| Config File | Location | Who Reads It | Schema Enforcement |
|-------------|----------|--------------|-------------------|
| `agents.json` | `.claude/agents.json` (repo-local) | Companion on every invocation | JSON Schema validated at load time; hard error if invalid |
| Job records | `PLUGIN_DATA/state/<hash>/jobs/<id>.json` | Companion (`status`, `result`, `cancel` commands) | TypeScript types; no external schema |
| Session files | `PLUGIN_DATA/state/<hash>/sessions/<agent-id>.json` | Companion (`loadSession`, `saveSession` hooks) | Per-adapter encoder/decoder |

---

## Sources

- Project requirements: `.planning/PROJECT.md` (authoritative, 2026-04-04)
- Reference implementation pattern: `codex-plugin-cc` (mentioned as design baseline in PROJECT.md)
- Node.js `child_process` detached worker pattern: https://nodejs.org/api/child_process.html#optionsdetached (Node.js official docs)
- Claude Code plugin layout spec: inferred from `codex-plugin-cc` reference and `.claude-plugin/` directory convention
- Strategy pattern for adapters: standard OOP pattern, applied to multi-adapter CLI orchestration

---
*Architecture research for: Standalone Universal Agents Plugin for Claude Code*
*Researched: 2026-04-04*
