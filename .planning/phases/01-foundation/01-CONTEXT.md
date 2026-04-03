# Phase 1: Foundation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a valid Claude Code plugin package skeleton with the correct directory structure, zero Paperclip imports, and a passing layout conformance test. No feature code — just the scaffold, build tooling, CI pipeline, and structural tests that prove the foundation is solid.

</domain>

<decisions>
## Implementation Decisions

### Repository Structure
- **D-01:** Monorepo with npm workspaces — `packages/runtime` (publishable adapter core) and `packages/plugin` (Claude Code plugin package). npm workspace boundaries enforce the Paperclip isolation constraint (ADPT-01) at the package level.
- **D-02:** `.claude-plugin/` is a subdirectory inside `packages/plugin/`, not the package root. `packages/plugin/` holds dev tooling (src/, tests, package.json, tsconfig) while `.claude-plugin/` is the distributable artifact. A build step copies compiled scripts into `.claude-plugin/scripts/`.

### Stub Content Depth
- **D-03:** Structurally valid stubs — `marketplace.json` and `plugin.json` have all required fields with real values (name, version, command declarations). Command `.md` files have correct frontmatter structure but minimal body (placeholder for Phase 3). Layout conformance test validates both file existence AND content shape.

### CI / Build Pipeline
- **D-04:** GitHub Actions CI workflow (`.github/workflows/ci.yml`) set up in Phase 1. Runs: TypeScript compile, vitest, layout conformance test, `npm pack` Paperclip-free check. Feedback loop from day one.
- **D-05:** ESLint with essential rules only — `no-restricted-imports` (Paperclip boundary), strict TypeScript checks (`noImplicitAny`, `strictNullChecks`). No style rules — Prettier handles formatting. Small, correctness-focused lint config.

### Reference Implementation
- **D-06:** Follow the Claude Code plugin spec independently, not mirror codex-plugin-cc's exact structure. Use codex-plugin-cc as inspiration for the UX model (slash commands + subagent + background jobs) but make file names, directory layout, and metadata decisions based on the spec itself.
- **D-07:** No formal plugin spec document exists. Researcher should study codex-plugin-cc's structure to infer the Claude Code plugin format requirements (marketplace.json schema, plugin.json format, command file conventions).

### Pre-existing Decisions (from STATE.md)
- **D-08:** `tsup` bundles companion script to single `.cjs` file; `tsc` for runtime package type declarations
- **D-09:** `zod` v3 is the single runtime dependency — schema + TypeScript types from one source
- **D-10:** Paperclip boundary enforced by `no-restricted-imports` lint rule + `npm pack` CI check

### Claude's Discretion
- Exact vitest configuration and test file organization
- Prettier config details
- tsconfig compiler options beyond the strict flags mentioned above
- Root package.json workspace configuration details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Plugin Format
- No formal spec document exists — researcher must study `codex-plugin-cc` (external reference implementation) to infer the Claude Code plugin spec: `marketplace.json` schema, `plugin.json` format, command `.md` frontmatter conventions, agent definition format

### Project Documentation
- `.planning/PROJECT.md` — Vision, constraints, key decisions, adapter list
- `.planning/REQUIREMENTS.md` — LAYOUT-01 through LAYOUT-06, ADPT-01, TEST-04 (Phase 1 requirements)
- `.planning/ROADMAP.md` — Phase 1 success criteria and scope boundary

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. Only a bare `package.json` exists at root with no dependencies or meaningful config.

### Established Patterns
- None yet — Phase 1 establishes the patterns (monorepo workspaces, build tooling, lint config) that subsequent phases will follow.

### Integration Points
- Root `package.json` needs to be converted to a workspaces root
- `.github/workflows/ci.yml` is new (no existing CI)
- No existing TypeScript config to extend

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-04*
