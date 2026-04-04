# Phase 2: Runtime Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 02-runtime-core
**Areas discussed:** Adapter strategy pattern, Config schema design, Session persistence model, Fake CLI test fixtures

---

## Adapter Strategy Pattern

### Where should adapter code live?

| Option | Description | Selected |
|--------|-------------|----------|
| All in packages/runtime | Adapters are part of the publishable runtime package. Plugin companion imports them. Clean separation. | Y |
| Split: interface in runtime, implementations in plugin | Runtime exports interface + shared utils. Plugin has actual implementations. | |
| All in packages/plugin | Everything in plugin. Runtime only exports types and shared utils. | |

**User's choice:** All in packages/runtime
**Notes:** None

### How should the six adapters share behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Base class with per-adapter overrides | Abstract BaseAdapter with execute(), parseOutput(), encodeSession(), decodeSession(). Common timeout/kill logic in base. | Y |
| Functional strategy with config objects | Plain objects with functions. Generic runAdapter() orchestrates. No classes. | |
| Adapter registry with plugin pattern | Adapters register into a registry by adapterType string. Runtime looks them up at execution time. | |

**User's choice:** Base class with per-adapter overrides
**Notes:** None

### How should the five hook interfaces be provided?

| Option | Description | Selected |
|--------|-------------|----------|
| Default implementations + optional overrides | Runtime ships sensible defaults. Companion can override any hook at init. | Y |
| All hooks required at init | Companion must provide all five hooks. No defaults. | |
| Hooks as middleware chain | Each hook is a stack of functions. Runtime provides base, consumers push layers. | |

**User's choice:** Default implementations + optional overrides
**Notes:** None

---

## Config Schema Design

### How should adapter-specific config be structured?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed adapterConfig per adapter | Discriminated union keyed by adapterType. Each adapter defines its own zod schema. | Y |
| Flat extra fields on agent entry | No nested adapterConfig. Adapter-specific fields at top level. | |
| Freeform adapterConfig | Untyped object. Each adapter validates at runtime. | |

**User's choice:** Typed adapterConfig per adapter
**Notes:** None

### What should happen with unknown fields?

| Option | Description | Selected |
|--------|-------------|----------|
| Strip unknown fields silently | Zod .strip() mode. Forward-compatible. | Y |
| Reject unknown fields | Zod .strict() mode. Catches typos. | |
| Preserve unknown fields | Zod .passthrough() mode. Forwards custom config. | |

**User's choice:** Strip unknown fields silently
**Notes:** None

### How should the companion locate agents.json?

| Option | Description | Selected |
|--------|-------------|----------|
| Walk up from cwd | Standard workspace-root discovery. Matches Claude Code conventions. | Y |
| Require explicit --config path | User must pass config path via CLI flag. | |
| Check cwd/.claude/ only | Only check current directory. No walk. | |

**User's choice:** Walk up from cwd to find .claude/agents.json
**Notes:** None

---

## Session Persistence Model

### What file format for persisted sessions?

| Option | Description | Selected |
|--------|-------------|----------|
| JSON with adapter-specific shape | Each adapter defines its own session schema. Human-readable. | Y |
| Opaque binary blob per adapter | Adapter encodes/decodes own format. Not inspectable. | |
| Unified session envelope | Standard wrapper with versioning around adapter-specific payload. | |

**User's choice:** JSON with adapter-specific shape
**Notes:** None

### How should workspace hashing work?

| Option | Description | Selected |
|--------|-------------|----------|
| SHA-256 of absolute workspace root | Full hash. Deterministic, no collisions. | Y |
| Slugified workspace path | Human-readable but potential collisions. | |
| Short hash (first 12 chars) | Shorter directory names. Still unlikely to collide. | |

**User's choice:** SHA-256 of absolute workspace root
**Notes:** None

### How should session codec errors be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Warn and start fresh | Log corruption, delete bad file, continue as --fresh. | Y |
| Error and abort | Return error. User must manually --fresh. | |
| Attempt repair then fallback | Partial parsing, salvage what's possible. | |

**User's choice:** Warn and start fresh
**Notes:** None

---

## Fake CLI Test Fixtures

### How should fake CLI shims work?

| Option | Description | Selected |
|--------|-------------|----------|
| Shell scripts that echo fixture output | Simple scripts per adapter. Tests set PATH to include fixture dir. | Y |
| Node scripts with scenario switching | Node scripts that switch behavior based on env vars/args. | |
| Mock the child_process module | No real processes. Mock spawn/exec in tests. | |

**User's choice:** Shell scripts that echo fixture output
**Notes:** None

### How to handle the stale training data blocker?

| Option | Description | Selected |
|--------|-------------|----------|
| Research current formats during plan-phase | Use /gsd:research-phase to verify. Matches STATE.md recommendation. | Y |
| Best-effort from docs + update later | Implement from docs, accept some parsers may need updating. | |
| Defer uncertain adapters | Only implement well-documented adapters. Defer others. | |

**User's choice:** Research current formats during plan-phase
**Notes:** None

### What scenarios should smoke tests cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Success + timeout + error | Three scenarios per adapter. Covers critical paths. | Y |
| Success only | Happy path only. Minimal. | |
| Full matrix | 5+ scenarios x 6 adapters. Thorough but heavy. | |

**User's choice:** Success + timeout + error
**Notes:** None

---

## Claude's Discretion

- Internal naming conventions for adapter files
- Exact zod schema field names for each adapter's adapterConfig
- Log entry format details
- Child-process spawning implementation details
- Workspace root walk-up algorithm implementation

## Deferred Ideas

- cursor headless mode unconfirmed -- may defer to v2 if GUI context required (research phase will verify)
- Remote/webhook adapters (http, process, openclaw_gateway) -- v2 scope
