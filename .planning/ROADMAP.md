# Roadmap: Standalone Universal Agents Plugin for Claude Code

## Overview

Build a zero-dependency Claude Code plugin that orchestrates local AI CLI agents. Three phases: establish the package skeleton and enforce the Paperclip boundary, build the runtime core (config, adapters, sessions), then wire up the full command surface with background job execution and the delegation subagent.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Plugin skeleton, package boundary enforcement, layout conformance test (completed 2026-04-03)
- [ ] **Phase 2: Runtime Core** - Config loader, all six adapters, session persistence, logging
- [ ] **Phase 3: Commands & Execution** - All six commands, background jobs, delegation subagent, hardening

## Phase Details

### Phase 1: Foundation
**Goal**: A valid Claude Code plugin package exists with the correct directory structure, zero Paperclip imports, and a passing layout conformance test — ready for feature code
**Depends on**: Nothing (first phase)
**Requirements**: LAYOUT-01, LAYOUT-02, LAYOUT-03, LAYOUT-04, LAYOUT-05, LAYOUT-06, ADPT-01, TEST-04
**Success Criteria** (what must be TRUE):
  1. `ls .claude-plugin/` shows `marketplace.json`, `plugin.json`, `commands/`, `agents/`, `scripts/` at the correct paths
  2. Plugin layout conformance test passes — all required files present and structurally valid
  3. `npm pack` produces a tarball with zero references to `paperclip-*` packages
  4. TypeScript compilation and vitest runner complete without errors in CI
**Plans:** 3/3 plans complete

Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton, build tooling, TypeScript config, ESLint Paperclip boundary, npm install
- [x] 01-02-PLAN.md — Plugin layout files: marketplace.json, plugin.json, command stubs, delegation agent, companion stub
- [x] 01-03-PLAN.md — Layout conformance test, vitest config, GitHub Actions CI workflow

### Phase 2: Runtime Core
**Goal**: The companion script can load and validate agent config, execute any of the six local CLIs via the adapter strategy, persist workspace-scoped sessions, and log execution events correctly
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, ADPT-02, ADPT-03, ADPT-04, ADPT-05, ADPT-06, ADPT-07, ADPT-08, ADPT-09, ADPT-10, SESS-01, SESS-02, SESS-03, SESS-04, ERR-03, ERR-05, LOG-01, LOG-02, LOG-03, TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Adding an agent to `.claude/agents.json` with an invalid field causes the companion to exit with a human-readable error naming the failing field path
  2. Running a foreground task against a fake CLI shim returns the adapter's parsed output correctly
  3. A session file is created at the correct workspace-hashed path after the first successful task run; `--fresh` deletes it; `--resume` reloads it
  4. All six adapter smoke tests pass using fake CLI fixtures — no real AI binaries needed
  5. Adapter timeout causes the companion to kill the child process and return a timeout error instead of hanging
**Plans:** 2/5 plans executed

Plans:
- [x] 02-00-PLAN.md — Vitest test infrastructure, tsconfig split for runtime package
- [x] 02-01-PLAN.md — Types, config schema/loader, process runner, JSON/JSONL parse utilities, unit tests
- [ ] 02-02-PLAN.md — Hooks with default implementations, session persistence, structured logging, unit tests
- [ ] 02-03-PLAN.md — BaseAdapter abstract class with Logger integration and all six CLI adapter subclasses
- [ ] 02-04-PLAN.md — Adapter smoke tests with fake CLI shims

### Phase 3: Commands & Execution
**Goal**: A developer can configure agents with `/agents:setup`, dispatch tasks in foreground and background, track jobs, retrieve results, cancel running jobs, and have the delegation subagent auto-select the right agent — all with correct error handling
**Depends on**: Phase 2
**Requirements**: CONF-05, CONF-06, CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-07, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, CMD-13, JOB-01, JOB-02, JOB-03, JOB-04, JOB-05, JOB-06, JOB-07, DELEG-01, DELEG-02, DELEG-03, ERR-01, ERR-02, ERR-04, TEST-03, TEST-05
**Success Criteria** (what must be TRUE):
  1. `/agents:setup` wizard creates a valid `.claude/agents.json` and `/agents:list` shows the configured agents in a table
  2. `/agents:task --background` returns a job-id immediately without blocking; `/agents:status <job-id>` returns `running` while the worker executes
  3. `/agents:result <job-id>` prints the full agent output after the background job completes
  4. `/agents:cancel <job-id>` terminates the background worker and all child CLI processes; subsequent `/agents:status` returns `cancelled`
  5. All companion integration tests pass with fake CLIs, covering the full task → status → result → cancel lifecycle without any real AI binary installed
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-04-03 |
| 2. Runtime Core | 2/5 | In Progress|  |
| 3. Commands & Execution | 0/TBD | Not started | - |
