# Phase 3: Commands & Execution - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 03-commands-execution
**Areas discussed:** Companion CLI design, Background job architecture, Command file content, Delegation subagent

---

## Companion CLI Design

### CLI Parsing
| Option | Description | Selected |
|--------|-------------|----------|
| Minimal hand-rolled parser | Parse argv manually — subcommand as argv[2], flags via simple loop. Zero new dependencies. | ✓ |
| Use a CLI framework (e.g. commander, yargs) | Adds a dependency but gives flag validation, help text generation, subcommand routing. | |
| You decide | Claude picks the best approach during planning. | |

**User's choice:** Minimal hand-rolled parser
**Notes:** None

### Subcommand Pattern
| Option | Description | Selected |
|--------|-------------|----------|
| Single entry point with subcommand arg | One script: `companion setup`, `companion task --agent x`. One file to bundle. | ✓ |
| Separate script per command | Six scripts: `companion-setup`, `companion-task`, etc. | |
| You decide | Claude picks based on plugin spec. | |

**User's choice:** Single entry point with subcommand arg
**Notes:** None

### Config Guard
| Option | Description | Selected |
|--------|-------------|----------|
| Fail with setup hint | Exit with clear error and setup hint. Satisfies ERR-01/ERR-02. | ✓ |
| Auto-launch setup wizard | Automatically start setup flow if config missing. | |
| You decide | Claude picks the best UX. | |

**User's choice:** Fail with setup hint
**Notes:** None

---

## Background Job Architecture

### Job Spawn
| Option | Description | Selected |
|--------|-------------|----------|
| Detached child_process.fork | Fork a worker script as detached child with stdio: 'ignore' and unref(). | ✓ |
| Detached child_process.spawn with node | Spawn `node worker.js` as detached process. | |
| You decide | Claude picks the most robust approach. | |

**User's choice:** Detached child_process.fork
**Notes:** None

### Worker Structure
| Option | Description | Selected |
|--------|-------------|----------|
| Separate worker entry point | Dedicated `worker.ts` bundled alongside companion. Takes job-id + config as args. | ✓ |
| Same companion with --worker flag | Companion re-invokes itself with `--worker <job-id>` flag. | |
| You decide | Claude picks based on bundling constraints. | |

**User's choice:** Separate worker entry point
**Notes:** None

### Cancel Polling
| Option | Description | Selected |
|--------|-------------|----------|
| Worker polls every 1s | Check for cancel sentinel file existence every 1 second. | ✓ |
| Use filesystem watch (fs.watch) | Watch cancel directory for file creation. Event-driven. | |
| You decide | Claude picks the most reliable approach. | |

**User's choice:** Worker polls every 1s
**Notes:** None

---

## Command File Content

### Invocation Pattern
| Option | Description | Selected |
|--------|-------------|----------|
| Bash call with structured output | Command .md tells Claude to run companion via Bash and parse JSON output. | ✓ |
| Agent-style instructions | Command .md describes intent, lets Claude figure out invocation. | |
| You decide | Claude picks based on plugin spec conventions. | |

**User's choice:** Bash call with structured output
**Notes:** None

### Setup Wizard
| Option | Description | Selected |
|--------|-------------|----------|
| Guided interactive wizard | Claude asks user for agent details one by one, then calls companion to write config. | ✓ |
| Single-shot command | All config provided as flags upfront. | |
| You decide | Claude picks based on plugin conventions. | |

**User's choice:** Guided interactive wizard
**Notes:** None

### Output Format
| Option | Description | Selected |
|--------|-------------|----------|
| JSON for machine, formatted by Claude | Companion always outputs JSON. Claude parses and presents human-readable. | ✓ |
| Human-readable text directly | Companion outputs formatted text. | |
| You decide | Claude picks the most practical approach. | |

**User's choice:** JSON for machine, formatted by Claude
**Notes:** None

---

## Delegation Subagent

### Selection Strategy
| Option | Description | Selected |
|--------|-------------|----------|
| Claude picks from descriptions | Subagent lists agent descriptions, Claude selects best match using judgment. | ✓ |
| Keyword/similarity scoring | Companion computes similarity score between task and descriptions. | |
| You decide | Claude picks the best matching strategy. | |

**User's choice:** Claude picks from descriptions
**Notes:** None

### Fallback Behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Show agent list and ask user | Display all agents and ask user to pick. Satisfies DELEG-03. | ✓ |
| Use default agent | Fall back to defaultAgent from agents.json. | |
| You decide | Claude picks the best fallback. | |

**User's choice:** Show agent list and ask user
**Notes:** None

### Agent Data Source
| Option | Description | Selected |
|--------|-------------|----------|
| Call companion list command | Subagent calls `companion list --json`. Single source of truth. | ✓ |
| Read agents.json directly | Subagent reads .claude/agents.json via Read tool. | |
| You decide | Claude picks the most consistent approach. | |

**User's choice:** Call companion list command
**Notes:** None

---

## Claude's Discretion

- Job ID generation format
- Exact JSON output schemas for each command
- Command .md frontmatter fields and formatting conventions
- Worker script error recovery details
- Companion exit codes
- Exact flag names beyond those in requirements

## Deferred Ideas

None — discussion stayed within phase scope.
