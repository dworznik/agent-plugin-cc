# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 01-foundation
**Areas discussed:** Repository structure, Stub content depth, CI / build pipeline, Reference implementation

---

## Repository Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo workspaces | packages/runtime + packages/plugin. npm workspaces enforce boundary. Matches PROJECT.md's 'publishable runtime' intent. | ✓ |
| Single package, internal boundary | One package.json, src/runtime/ and src/plugin/. Lint-only boundary. Simpler but weaker isolation. | |
| Flat plugin-only | No separate runtime package. Everything under .claude-plugin/. Fastest but doesn't match publishable intent. | |

**User's choice:** Monorepo workspaces (Recommended)
**Notes:** None

### Follow-up: Plugin root structure

| Option | Description | Selected |
|--------|-------------|----------|
| Subdirectory | .claude-plugin/ is a subdirectory inside packages/plugin/. Build step copies compiled scripts. Clean dev vs distributable separation. | ✓ |
| Plugin root IS .claude-plugin | packages/plugin/ is literally .claude-plugin/. Mixes dev tooling with distributable. | |

**User's choice:** Subdirectory (Recommended)
**Notes:** None

---

## Stub Content Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Structurally valid stubs | All required fields with real values. Command .md files have correct frontmatter but minimal body. Layout test validates structure AND content shape. | ✓ |
| Minimal placeholders | Files exist but barely populated. Layout test only checks existence. | |
| Fully detailed | All metadata and full prompt templates. Writing Phase 3 content early. | |

**User's choice:** Structurally valid stubs (Recommended)
**Notes:** None

---

## CI / Build Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Actions now | .github/workflows/ci.yml with TS compile, vitest, layout test, npm-pack check. | ✓ |
| Local scripts only | Just npm scripts. CI deferred. | |
| You decide | Claude picks. | |

**User's choice:** GitHub Actions now (Recommended)
**Notes:** None

### Follow-up: Lint strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Essential rules only | no-restricted-imports + strict TS checks. No style rules (Prettier). | ✓ |
| Full strict config | Recommended rulesets, import ordering, no-unused-vars as errors. | |
| You decide | Claude picks. | |

**User's choice:** Essential rules only (Recommended)
**Notes:** None

---

## Reference Implementation

| Option | Description | Selected |
|--------|-------------|----------|
| Follow the spec, not the ref | Use codex-plugin-cc as inspiration but follow Claude Code plugin spec independently. | ✓ |
| Mirror codex-plugin-cc closely | Copy exact layout and patterns. | |
| Ignore codex-plugin-cc entirely | Design from spec alone. | |

**User's choice:** Follow the spec, not the ref (Recommended)
**Notes:** None

### Follow-up: Plugin spec source

| Option | Description | Selected |
|--------|-------------|----------|
| Research from codex-plugin-cc | No formal spec doc. Researcher studies codex-plugin-cc's structure to infer requirements. | ✓ |
| I have a spec doc | User has a specific document. | |
| You decide | Claude figures out best source. | |

**User's choice:** Research from codex-plugin-cc
**Notes:** None

---

## Claude's Discretion

- Exact vitest configuration and test file organization
- Prettier config details
- tsconfig compiler options beyond strict flags
- Root package.json workspace configuration details

## Deferred Ideas

None — discussion stayed within phase scope.
