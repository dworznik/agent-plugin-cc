---
phase: 01-foundation
plan: 03
subsystem: testing
tags: [vitest, github-actions, layout-conformance, ci, typescript]

# Dependency graph
requires:
  - phase: 01-01
    provides: monorepo skeleton with vitest at root, tsup, tsconfig.base.json
  - phase: 01-02
    provides: plugin layout files (.claude-plugin/, commands/, agents/, scripts/)

provides:
  - Plugin layout conformance test (packages/plugin/tests/layout.test.ts) — 39 tests covering LAYOUT-01 through LAYOUT-06
  - Plugin vitest config (packages/plugin/vitest.config.ts)
  - GitHub Actions CI workflow (.github/workflows/ci.yml) with typecheck, lint, build, test, paperclip-free check

affects:
  - Phase 02 (adapters): test patterns established here apply to adapter unit tests
  - Phase 03 (e2e): CI workflow is the base pipeline to extend

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Layout conformance test uses existsSync + readFileSync + JSON.parse for structural validation
    - Frontmatter extraction via regex match on YAML block
    - CI workflow runs npm pack --dry-run to verify no paperclip references ship in packages

key-files:
  created:
    - packages/plugin/vitest.config.ts
    - packages/plugin/tests/layout.test.ts
    - .github/workflows/ci.yml
  modified:
    - packages/plugin/tsconfig.json

key-decisions:
  - "Removed rootDir from plugin tsconfig.json since noEmit:true makes rootDir enforcement counterproductive for test-inclusive projects"
  - "Added types:[node] to plugin tsconfig instead of installing @types/node in plugin devDependencies — already hoisted from root"

patterns-established:
  - "Layout conformance test pattern: fileExists() + readJson() + readFile() + extractFrontmatter() helpers over a PLUGIN_ROOT base path"
  - "CI pipeline order: typecheck → lint → build → test → pack-check (fail fast on type errors before running tests)"

requirements-completed: [LAYOUT-06, TEST-04]

# Metrics
duration: 10min
completed: 2026-04-03
---

# Phase 01 Plan 03: Layout Conformance Test and CI Summary

**39-test vitest layout conformance suite validating LAYOUT-01 through LAYOUT-06, plus GitHub Actions CI pipeline with typecheck, lint, build, test, and paperclip-free npm pack check**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-03T19:00:00Z
- **Completed:** 2026-04-03T19:10:29Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `packages/plugin/tests/layout.test.ts` — 39 tests covering all LAYOUT-01 through LAYOUT-06 requirements; all pass
- Created `packages/plugin/vitest.config.ts` — plugin-specific vitest config targeting `tests/**/*.test.ts`
- Created `.github/workflows/ci.yml` — full CI pipeline with typecheck, lint, build, test, and paperclip-free pack check on every push/PR to main (D-04, ADPT-01)
- Fixed `packages/plugin/tsconfig.json` to include test files without rootDir conflict

## Task Commits

Each task was committed atomically:

1. **Task 1: Plugin vitest config and layout conformance test** - `ca3232d` (feat)
2. **Task 2: GitHub Actions CI workflow** - `51a3bd8` (chore)
3. **Auto-fix: Plugin tsconfig rootDir and node types** - `e06231f` (fix)

## Files Created/Modified

- `packages/plugin/vitest.config.ts` — Plugin vitest config with `tests/**/*.test.ts` include pattern
- `packages/plugin/tests/layout.test.ts` — 39-test layout conformance suite (LAYOUT-01 through LAYOUT-06, TEST-04)
- `.github/workflows/ci.yml` — CI pipeline: checkout, Node 20, npm ci, typecheck, lint, build, test, paperclip-free check
- `packages/plugin/tsconfig.json` — Removed rootDir constraint, added types:["node"] for test file compatibility

## Decisions Made

- Removed `rootDir: ./src` from plugin tsconfig because it has `noEmit: true` — no output declarations to constrain, and rootDir blocks inclusion of tests outside src
- Added `types: ["node"]` to plugin tsconfig rather than adding `@types/node` to plugin devDependencies — the package is already hoisted from root devDependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed plugin tsconfig preventing typecheck with test files**
- **Found during:** Task 2 verification (npm run typecheck)
- **Issue:** `packages/plugin/tsconfig.json` had `rootDir: ./src` which made TypeScript reject `tests/layout.test.ts` as outside the root. Also lacked `types: ["node"]` so `node:fs`, `node:path`, `__dirname` were unresolved.
- **Fix:** Removed `rootDir` setting (irrelevant with noEmit:true), added `"types": ["node"]` to compilerOptions
- **Files modified:** `packages/plugin/tsconfig.json`
- **Verification:** `npm run typecheck` exits 0, `npm run lint` exits 0, `npx vitest run` still passes 39 tests
- **Committed in:** `e06231f`

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in tsconfig from prior plan)
**Impact on plan:** Necessary for typecheck compliance. The tsconfig was created in Plan 01-01 without anticipating test files outside src. No scope creep.

## Issues Encountered

None beyond the tsconfig fix documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 1 foundation is fully complete: monorepo skeleton, plugin layout files, layout conformance test, and CI pipeline all in place
- Phase 2 (adapters): adapter unit tests can follow the same vitest + helper pattern established in layout.test.ts
- CI pipeline is the canonical reference for what must pass before merging

---
*Phase: 01-foundation*
*Completed: 2026-04-03*
