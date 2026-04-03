# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Claude Code plugin package structure, npm workspaces monorepo, TypeScript/tsup build tooling, vitest testing
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Monorepo with npm workspaces — `packages/runtime` (publishable adapter core) and `packages/plugin` (Claude Code plugin package). npm workspace boundaries enforce the Paperclip isolation constraint (ADPT-01) at the package level.
- **D-02:** `.claude-plugin/` is a subdirectory inside `packages/plugin/`, not the package root. `packages/plugin/` holds dev tooling (src/, tests, package.json, tsconfig) while `.claude-plugin/` is the distributable artifact. A build step copies compiled scripts into `.claude-plugin/scripts/`.
- **D-03:** Structurally valid stubs — `marketplace.json` and `plugin.json` have all required fields with real values (name, version, command declarations). Command `.md` files have correct frontmatter structure but minimal body. Layout conformance test validates both file existence AND content shape.
- **D-04:** GitHub Actions CI workflow (`.github/workflows/ci.yml`) set up in Phase 1. Runs: TypeScript compile, vitest, layout conformance test, `npm pack` Paperclip-free check.
- **D-05:** ESLint with essential rules only — `no-restricted-imports` (Paperclip boundary), strict TypeScript checks (`noImplicitAny`, `strictNullChecks`). No style rules — Prettier handles formatting.
- **D-06:** Follow Claude Code plugin spec independently, not mirror codex-plugin-cc's exact structure.
- **D-07:** No formal plugin spec document exists — researcher should study codex-plugin-cc's structure to infer requirements.
- **D-08:** `tsup` bundles companion script to single `.cjs` file; `tsc` for runtime package type declarations.
- **D-09:** `zod` v3 is the single runtime dependency.
- **D-10:** Paperclip boundary enforced by `no-restricted-imports` lint rule + `npm pack` CI check.

### Claude's Discretion

- Exact vitest configuration and test file organization
- Prettier config details
- tsconfig compiler options beyond `noImplicitAny` and `strictNullChecks`
- Root package.json workspace configuration details

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAYOUT-01 | Plugin package contains `.claude-plugin/marketplace.json` with valid plugin metadata | Authoritative schema fetched from official docs + codex-plugin-cc reference |
| LAYOUT-02 | Plugin package contains `plugin.json` declaring all six commands and delegation subagent | Official plugin.json schema documented; commands + agents path conventions confirmed |
| LAYOUT-03 | Plugin package contains `commands/` directory with one file per command | Frontmatter fields for command .md files confirmed from official reference impl |
| LAYOUT-04 | Plugin package contains `agents/` directory with delegation subagent definition | Agent .md frontmatter schema confirmed from official docs |
| LAYOUT-05 | Plugin package contains `scripts/` directory with Node companion script | scripts/ directory pattern confirmed from codex-plugin-cc; placeholder .cjs stub required |
| LAYOUT-06 | Plugin layout passes structural conformance test | Test must check file existence + JSON content shape using vitest |
| ADPT-01 | Runtime package has zero imports from Paperclip — enforced by lint rule or import check in CI | ESLint flat config `no-restricted-imports` + `npm pack` grep check in CI confirmed viable |
| TEST-04 | Plugin layout test verifies all required files are present at correct paths | vitest test using `fs.existsSync` + JSON.parse validation is the standard approach |
</phase_requirements>

---

## Summary

Phase 1 establishes the project skeleton: a two-package npm workspaces monorepo (`packages/runtime` and `packages/plugin`), the Claude Code plugin layout inside `packages/plugin/.claude-plugin/`, build tooling (tsup for the companion script, tsc for the runtime), ESLint with import boundary enforcement, GitHub Actions CI, and a layout conformance test.

The official Claude Code plugin spec was located at `code.claude.com/docs/en/plugins-reference` and `code.claude.com/docs/en/plugin-marketplaces`. These are the authoritative sources for all file schemas. The spec has one key structural rule: `.claude-plugin/` contains ONLY `plugin.json` (the manifest). All component directories — `commands/`, `agents/`, `scripts/` — live at the plugin root (i.e., at `packages/plugin/`), not inside `.claude-plugin/`. Decision D-02 aligns with this: `.claude-plugin/` is the metadata container, the plugin root is `packages/plugin/`.

The spec also confirms that `plugin.json` is **optional** when using auto-discovery, but for declaring all six commands and the delegation subagent explicitly, a `plugin.json` is required. The `marketplace.json` format (inside `.claude-plugin/`) matches what codex-plugin-cc uses: `name`, `owner`, `metadata`, `plugins[]` with `name`/`source`/`description`.

**Primary recommendation:** Build the plugin root at `packages/plugin/` with `commands/`, `agents/`, `scripts/` at that level, and `marketplace.json` + `plugin.json` inside `packages/plugin/.claude-plugin/`. The layout conformance test validates this structure using vitest + Node `fs` checks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typescript | 6.0.2 | Type checking + declaration generation | Project constraint; tsc used for runtime package |
| tsup | 8.5.1 | Bundle companion script to single .cjs | Decided in D-08; zero-config esbuild-based bundler |
| vitest | 4.1.2 | Test runner | Fast, TypeScript-native, no separate ts-jest config |
| eslint | 10.1.0 | Import boundary enforcement | Required for no-restricted-imports rule (D-10) |
| @typescript-eslint/eslint-plugin | 8.58.0 | TypeScript-aware lint rules | Required for @typescript-eslint/no-restricted-imports |
| prettier | 3.8.1 | Code formatting | D-05: style rules delegated to Prettier |
| zod | 4.3.6 | Runtime schema validation | D-09: single runtime dependency |

**Note on zod version:** The project constraint says "zod v3" (D-09). The current npm registry shows zod 4.x. Verify whether the project means "pin to v3.x" or "zod v3 API" — zod 4 has API changes. The safe choice for Phase 1 is `zod@^3` to match the stated constraint.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | 25.5.2 | Node.js type declarations | Required for fs, path, process in TypeScript |
| @vitest/coverage-v8 | 4.1.2 | Code coverage | Optional in Phase 1; add if coverage reporting desired in CI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup | esbuild directly | tsup wraps esbuild with sane defaults; no reason to use esbuild raw |
| vitest | jest | vitest is TypeScript-native, no ts-jest transform needed |
| ESLint flat config | legacy eslintrc | ESLint 9+ defaults to flat config; legacy format deprecated |

**Installation (workspace root):**
```bash
npm install --save-dev typescript tsup vitest @vitest/coverage-v8 @types/node eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

**Installation (packages/plugin):**
```bash
npm install --save-dev typescript tsup vitest @types/node
```

**Installation (packages/runtime):**
```bash
npm install zod@^3
npm install --save-dev typescript @types/node
```

**Version verification (confirmed 2026-04-04):**
```bash
npm view tsup version        # 8.5.1
npm view vitest version      # 4.1.2
npm view typescript version  # 6.0.2
npm view eslint version      # 10.1.0
npm view zod version         # 4.3.6 (confirm whether v3 is required)
npm view prettier version    # 3.8.1
```

---

## Architecture Patterns

### Monorepo Directory Layout

```
agent-plugin-cc/                     # workspace root (private: true)
├── package.json                     # workspaces: ["packages/*"]
├── tsconfig.base.json               # shared TS options
├── eslint.config.mjs                # flat config, no-restricted-imports rule
├── prettier.config.mjs              # formatter config
├── .github/
│   └── workflows/
│       └── ci.yml                   # D-04: TypeScript + vitest + layout test + npm pack check
├── packages/
│   ├── runtime/                     # publishable adapter core
│   │   ├── package.json             # name: @agent-plugin-cc/runtime, no paperclip deps
│   │   ├── tsconfig.json            # extends ../../tsconfig.base.json
│   │   └── src/
│   │       └── index.ts             # Phase 1 stub — exports nothing yet
│   └── plugin/                      # Claude Code plugin package
│       ├── package.json             # name: agent-plugin-cc-plugin (or similar)
│       ├── tsconfig.json
│       ├── .claude-plugin/          # D-02: metadata directory only
│       │   ├── marketplace.json     # LAYOUT-01
│       │   └── plugin.json          # LAYOUT-02
│       ├── commands/                # LAYOUT-03 — at plugin root, NOT in .claude-plugin/
│       │   ├── setup.md
│       │   ├── list.md
│       │   ├── task.md
│       │   ├── status.md
│       │   ├── result.md
│       │   └── cancel.md
│       ├── agents/                  # LAYOUT-04 — at plugin root
│       │   └── delegation.md
│       ├── scripts/                 # LAYOUT-05 — at plugin root
│       │   └── agents-companion.cjs # built by tsup; Phase 1: placeholder only
│       ├── src/
│       │   └── companion/
│       │       └── index.ts         # companion source, bundled to scripts/
│       └── tests/
│           └── layout.test.ts       # LAYOUT-06, TEST-04
```

### Pattern 1: npm Workspaces Root Configuration

**What:** Root `package.json` declares workspace packages; all devDependencies can live at root and be shared.
**When to use:** Always — this is the monorepo foundation.

```json
// package.json (root)
{
  "name": "agent-plugin-cc",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --build"
  }
}
```

### Pattern 2: tsup Single-File CJS Bundle

**What:** tsup bundles `packages/plugin/src/companion/index.ts` to `packages/plugin/scripts/agents-companion.cjs`. In Phase 1 this is a placeholder stub.
**When to use:** For the companion script that must run as a single file with no node_modules dependency.

```typescript
// packages/plugin/tsup.config.ts
// Source: tsup.egoist.dev official docs
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/companion/index.ts'],
  format: ['cjs'],
  outDir: 'scripts',
  outExtension: () => ({ js: '.cjs' }),
  splitting: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  noExternal: [/.*/],  // bundle ALL imports into single .cjs
});
```

### Pattern 3: ESLint Flat Config with no-restricted-imports

**What:** Enforces the Paperclip isolation boundary (ADPT-01) using the TypeScript-aware variant of `no-restricted-imports`.
**When to use:** Applied to `packages/runtime/src/**` at minimum; optionally whole repo.

```javascript
// eslint.config.mjs
// Source: typescript-eslint.io/rules/no-restricted-imports
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    files: ['packages/runtime/src/**/*.ts', 'packages/plugin/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['paperclip*', '@paperclip/*'],
            message: 'Paperclip imports are forbidden in this package (ADPT-01).'
          }
        ]
      }]
    }
  }
);
```

### Pattern 4: Plugin Layout Conformance Test

**What:** vitest test that checks all required plugin files exist at correct paths and that JSON files parse and contain required fields.
**When to use:** LAYOUT-06 and TEST-04 — the primary deliverable test for Phase 1.

```typescript
// packages/plugin/tests/layout.test.ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_ROOT = join(__dirname, '..');

function readJson(relPath: string) {
  return JSON.parse(readFileSync(join(PLUGIN_ROOT, relPath), 'utf-8'));
}

describe('Plugin layout conformance', () => {
  it('marketplace.json exists and has required fields', () => {
    expect(existsSync(join(PLUGIN_ROOT, '.claude-plugin/marketplace.json'))).toBe(true);
    const m = readJson('.claude-plugin/marketplace.json');
    expect(m.name).toBeDefined();
    expect(m.owner).toBeDefined();
    expect(Array.isArray(m.plugins)).toBe(true);
    expect(m.plugins.length).toBeGreaterThan(0);
  });

  it('plugin.json exists and has required fields', () => {
    expect(existsSync(join(PLUGIN_ROOT, '.claude-plugin/plugin.json'))).toBe(true);
    const p = readJson('.claude-plugin/plugin.json');
    expect(p.name).toBeDefined();
  });

  it.each(['setup', 'list', 'task', 'status', 'result', 'cancel'])(
    'commands/%s.md exists', (cmd) => {
      expect(existsSync(join(PLUGIN_ROOT, `commands/${cmd}.md`))).toBe(true);
    }
  );

  it('agents/delegation.md exists', () => {
    expect(existsSync(join(PLUGIN_ROOT, 'agents/delegation.md'))).toBe(true);
  });

  it('scripts/agents-companion.cjs exists', () => {
    expect(existsSync(join(PLUGIN_ROOT, 'scripts/agents-companion.cjs'))).toBe(true);
  });
});
```

### Pattern 5: GitHub Actions CI Workflow

**What:** Runs the full verification pipeline on every push.
**When to use:** D-04 — set up in Phase 1.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - name: Paperclip-free check
        run: |
          cd packages/plugin
          npm pack --dry-run 2>&1 | tee pack-output.txt
          if grep -r "paperclip" pack-output.txt; then
            echo "ERROR: paperclip reference found in packed output"
            exit 1
          fi
```

### Pattern 6: marketplace.json Schema (LAYOUT-01)

**What:** The `.claude-plugin/marketplace.json` format inferred from codex-plugin-cc and confirmed against official docs.

```json
{
  "name": "agents-plugin",
  "owner": {
    "name": "Your Name or Org"
  },
  "metadata": {
    "description": "Run local AI agents as background jobs from Claude Code.",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "agents",
      "description": "Invoke local AI agents (Claude, Codex, Cursor, Gemini, etc.) from Claude Code.",
      "version": "0.1.0",
      "author": {
        "name": "Your Name"
      },
      "source": ".."
    }
  ]
}
```

**Note:** For a self-contained plugin (no separate marketplace repo), the `source` in the plugin entry should point from `.claude-plugin/` back to the plugin root. Since the plugin root is `packages/plugin/`, the source `".."` from `.claude-plugin/marketplace.json` resolves to `packages/plugin/`.

### Pattern 7: plugin.json Schema (LAYOUT-02)

**What:** The `.claude-plugin/plugin.json` manifest declares all six commands and the delegation subagent.

```json
{
  "name": "agents",
  "version": "0.1.0",
  "description": "Run local AI agents as background jobs from Claude Code.",
  "commands": "./commands/",
  "agents": "./agents/"
}
```

**Note on component paths:** Per the official spec, `commands` and `agents` paths in `plugin.json` are relative to the plugin root (the directory containing `.claude-plugin/`), NOT relative to `.claude-plugin/` itself. The manifest is in `.claude-plugin/plugin.json` but paths like `"./commands/"` resolve against the parent directory.

### Pattern 8: Command .md Frontmatter (LAYOUT-03)

**What:** Each command file in `commands/` has a YAML frontmatter block. Confirmed from the official codex-plugin-cc reference implementation.

Supported frontmatter fields from official docs and codex-plugin-cc:
- `description` (string) — shown in the `/` command menu
- `argument-hint` (string) — shown as argument hint
- `allowed-tools` (string) — comma-separated tool scopes
- `disable-model-invocation` (boolean) — skips LLM, runs bash directly

Phase 1 stub example:
```markdown
---
description: Run a local AI agent task
argument-hint: '--agent <id> [--background] <prompt>'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" task $ARGUMENTS`
```

### Pattern 9: Agent Definition Frontmatter (LAYOUT-04)

**What:** Agent `.md` files in `agents/` use YAML frontmatter. Confirmed from official Claude Code plugin reference docs.

Supported fields: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`.

Phase 1 stub example:
```markdown
---
name: agents-delegate
description: Select the best-matching local AI agent for a task and invoke it via the agents companion
tools: Bash
---

You are a thin routing agent. Read `.claude/agents.json`, select the agent whose description best matches the user's request, and invoke it with `node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" task --agent <id> <prompt>`.
```

### Anti-Patterns to Avoid

- **Components inside `.claude-plugin/`:** The official spec is explicit — `commands/`, `agents/`, `scripts/` MUST be at the plugin root, not inside `.claude-plugin/`. Only `plugin.json` belongs in `.claude-plugin/`.
- **Absolute paths in plugin files:** All paths in `plugin.json` must be relative and start with `./`.
- **Using `--workspace` flag in vitest 3:** The `workspace` feature is deprecated since vitest 3.2 — use `projects` configuration instead.
- **Setting version in both marketplace.json and plugin.json:** Per official docs, `plugin.json` takes priority silently. Pick one location. For a self-contained monorepo plugin, set it in `plugin.json`.
- **`no-restricted-imports` (base rule) instead of `@typescript-eslint/no-restricted-imports`:** The TypeScript variant handles `import type` and other TS-specific import syntaxes that the base rule misses.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript bundling to .cjs | Custom rollup/webpack config | tsup | tsup wraps esbuild with zero config; handles external/internal marking automatically |
| JSON Schema validation at runtime | Hand-written type guards | zod | zod generates TS types + validates at runtime; error messages include field paths |
| ESLint TypeScript rule | Custom import scanner | @typescript-eslint/no-restricted-imports | Handles all TS import syntaxes; integrates with ESLint pipeline |
| npm pack verification | grep on source files | `npm pack --dry-run` in CI | Only way to verify what actually ends up in the tarball after .npmignore processing |

**Key insight:** The `npm pack --dry-run` check is the correct ADPT-01 verification method. Grepping source files will miss transitive dependencies that npm might include.

---

## Common Pitfalls

### Pitfall 1: Components Placed Inside .claude-plugin/

**What goes wrong:** The plugin loads but `commands/`, `agents/` are not discovered.
**Why it happens:** Developer mirrors the marketplace structure (which is in `.claude-plugin/`) and puts components there too.
**How to avoid:** Per official spec: `.claude-plugin/` contains ONLY `plugin.json`. All other directories live at the plugin root.
**Warning signs:** `claude --debug` shows "No commands found in plugin" despite files existing.

### Pitfall 2: plugin.json Path Resolution Confusion

**What goes wrong:** Component paths like `"./commands/"` resolve incorrectly.
**Why it happens:** Paths in `plugin.json` look like they'd resolve relative to `.claude-plugin/plugin.json` but they actually resolve relative to the plugin root (the directory containing `.claude-plugin/`).
**How to avoid:** Test with `claude plugin validate .` from the plugin root.

### Pitfall 3: tsup Externalizes zod by Default

**What goes wrong:** The bundled `.cjs` file tries to `require('zod')` at runtime but zod isn't installed at the execution site.
**Why it happens:** tsup auto-externalizes all `dependencies` and `peerDependencies` from `package.json`. Phase 1's companion is a stub so this won't bite yet, but Phase 2+ companion code that imports zod will fail unless zod is bundled.
**How to avoid:** In `tsup.config.ts` set `noExternal: [/zod/]` to force-bundle zod, OR use `noExternal: [/.*/]` to bundle everything. Confirm this in Phase 2 when the companion gains real logic.
**Warning signs:** `Error: Cannot find module 'zod'` at runtime when running the companion script outside the monorepo.

### Pitfall 4: zod v3 vs v4 API Differences

**What goes wrong:** D-09 says "zod v3" but npm registry ships v4. If zod@4 is installed, API may differ.
**Why it happens:** zod 4.x introduced breaking changes from v3.
**How to avoid:** Pin `"zod": "^3"` in `packages/runtime/package.json` in Phase 1. Confirm with project owner whether v4 is acceptable before Phase 2 adds real schema code.

### Pitfall 5: TypeScript 6 Breaking Changes

**What goes wrong:** tsc configuration or API use that worked on TS 5.x may fail on TS 6.0.
**Why it happens:** TypeScript 6.0.x is a major version (currently at 6.0.2).
**How to avoid:** Use the `strict` flag in tsconfig (enables `noImplicitAny` + `strictNullChecks` and others). Start clean with TS 6 from Phase 1 rather than migrating.

### Pitfall 6: Vitest Projects vs Workspace

**What goes wrong:** `vitest.workspace.ts` file causes deprecation warnings or errors in vitest 4.x.
**Why it happens:** The `workspace` feature was deprecated in vitest 3.2 and replaced by `projects` config.
**How to avoid:** Use `test: { projects: ['packages/*'] }` in root `vitest.config.ts` instead of a separate workspace file.

### Pitfall 7: npm workspaces + npm ci Version Lock

**What goes wrong:** `npm ci` fails if `package-lock.json` doesn't exist or is out of sync.
**Why it happens:** `npm ci` requires an exact lockfile. First run in CI with no lockfile fails.
**How to avoid:** Commit `package-lock.json` to the repository. Run `npm install` locally first to generate it.

---

## Code Examples

### Workspace Root package.json

```json
{
  "name": "agent-plugin-cc",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "vitest run",
    "lint": "eslint .",
    "typecheck": "tsc --build"
  },
  "devDependencies": {
    "typescript": "^6.0.2",
    "tsup": "^8.5.1",
    "vitest": "^4.1.2",
    "@types/node": "^25.5.2",
    "eslint": "^10.1.0",
    "@typescript-eslint/eslint-plugin": "^8.58.0",
    "@typescript-eslint/parser": "^8.58.0",
    "prettier": "^3.8.1"
  }
}
```

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### packages/runtime/package.json

```json
{
  "name": "@agent-plugin-cc/runtime",
  "version": "0.1.0",
  "description": "Paperclip-free adapter runtime for local AI CLI agents",
  "main": "./dist/index.cjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {
    "zod": "^3"
  },
  "devDependencies": {}
}
```

### packages/plugin/package.json

```json
{
  "name": "agent-plugin-cc",
  "version": "0.1.0",
  "description": "Run local AI agents as background jobs from Claude Code",
  "private": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run"
  }
}
```

### npm pack Paperclip-free CI check

```bash
# In CI: verify no paperclip-* package ends up in the packed plugin tarball
cd packages/plugin
npm pack --dry-run 2>&1 | grep -i "paperclip" && (echo "ERROR: paperclip found in pack output" && exit 1) || echo "OK: no paperclip references"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ESLint .eslintrc (legacy config) | ESLint flat config (eslint.config.mjs) | ESLint 9+ | Must use array-based config; old format deprecated |
| vitest workspace file (vitest.workspace.ts) | vitest projects config | vitest 3.2 | Use `test.projects` in vitest.config.ts |
| `@types/jest` + ts-jest | vitest (built-in TS support) | ~2023 onward | No separate transform config needed |
| tsconfig paths for monorepo | npm workspace symlinks | npm 7+ | Packages reference each other by package name; no path aliases needed |

**Deprecated/outdated:**
- `vitest.workspace.ts` / `vite.config.ts` workspace setup: replaced by `test.projects` in `vitest.config.ts` (vitest 3.2+)
- ESLint legacy `.eslintrc.js` format: deprecated in ESLint 9, removed path; must use flat config

---

## Open Questions

1. **zod v3 vs v4 pin**
   - What we know: D-09 says "zod v3 is the single runtime dependency". Current npm registry has zod 4.3.6. zod 4 has breaking API changes from v3.
   - What's unclear: Whether D-09 means "pin to v3.x" or whether it's stale and v4 is acceptable.
   - Recommendation: Pin `"zod": "^3"` in Phase 1. Revisit with project owner before Phase 2 adds real schema validation code.

2. **Companion script stub content**
   - What we know: Phase 1 requires `scripts/agents-companion.cjs` to exist (LAYOUT-05 + TEST-04).
   - What's unclear: Whether the stub should be a zero-byte file, a minimal Node shebang, or a fully structured entry-point skeleton.
   - Recommendation: Minimal Node shebang + exit-0 stub: `#!/usr/bin/env node\n// placeholder`. This proves the build pipeline works without implementing any logic.

3. **Plugin name namespace**
   - What we know: The spec says `name` in `plugin.json` is used for namespacing — e.g., commands appear as `plugin-name:command-name`.
   - What's unclear: Whether the plugin should be named `agents` (giving `/agents:task`) or something else.
   - Recommendation: Name the plugin `agents` so commands surface as `/agents:setup`, `/agents:task`, etc., matching the REQUIREMENTS.md command names.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build toolchain, companion script | Yes | v24.10.0 | — |
| npm | Package management, workspaces | Yes | 11.6.0 | — |
| git | CI, version control | Yes | 2.51.0 | — |
| claude CLI | Manual plugin install testing | Yes | installed | — (not required for CI) |
| GitHub Actions | CI pipeline (D-04) | Yes (cloud) | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` at workspace root (or per-package `vitest.config.ts`) |
| Quick run command | `vitest run --reporter=verbose` |
| Full suite command | `vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAYOUT-01 | marketplace.json exists with name, owner, plugins[] | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| LAYOUT-02 | plugin.json exists with name field | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| LAYOUT-03 | commands/setup.md..cancel.md all exist | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| LAYOUT-04 | agents/delegation.md exists | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| LAYOUT-05 | scripts/agents-companion.cjs exists | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| LAYOUT-06 | All required files pass structural check | unit | `vitest run --project packages/plugin` | No — Wave 0 |
| ADPT-01 | Runtime package imports contain no paperclip refs | CI check | `npm run lint && cd packages/plugin && npm pack --dry-run` | No — Wave 0 |
| TEST-04 | Layout test passes | unit | `vitest run --project packages/plugin` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `vitest run --project packages/plugin`
- **Per wave merge:** `vitest run` (full workspace)
- **Phase gate:** Full suite green + lint clean + `npm pack` Paperclip-free check before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/plugin/tests/layout.test.ts` — covers LAYOUT-01 through LAYOUT-06, TEST-04
- [ ] `packages/plugin/vitest.config.ts` — test config for plugin package
- [ ] `vitest.config.ts` (root) — workspace projects configuration
- [ ] `eslint.config.mjs` (root) — flat config with no-restricted-imports rule
- [ ] Framework install: `npm install` — run after workspace package.json files are created

---

## Sources

### Primary (HIGH confidence)

- `code.claude.com/docs/en/plugins-reference` — Official Claude Code plugin spec: plugin.json schema, component directories, file location rules, environment variables
- `code.claude.com/docs/en/plugin-marketplaces` — marketplace.json schema, plugin source types, walkthrough examples
- `raw.githubusercontent.com/openai/codex-plugin-cc/main/.claude-plugin/marketplace.json` — marketplace.json reference implementation
- `raw.githubusercontent.com/openai/codex-plugin-cc/main/plugins/codex/commands/status.md` — command .md frontmatter fields (disable-model-invocation, argument-hint, allowed-tools)
- `raw.githubusercontent.com/openai/codex-plugin-cc/main/plugins/codex/commands/cancel.md` — minimal command stub pattern
- `code.claude.com/docs/en/plugins-reference#agents` — agent .md frontmatter fields
- `tsup.egoist.dev` — tsup configuration documentation

### Secondary (MEDIUM confidence)

- npm registry `npm view` commands — current package versions verified 2026-04-04
- WebSearch: vitest 3.2+ projects vs workspace deprecation — cross-referenced with vitest.dev docs

### Tertiary (LOW confidence)

- WebSearch results about ESLint flat config — confirmed against typescript-eslint.io official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry 2026-04-04
- Plugin schema (marketplace.json, plugin.json): HIGH — fetched from official Claude Code docs and codex-plugin-cc reference
- Architecture: HIGH — derived directly from official spec + locked decisions
- Pitfalls: HIGH (MEDIUM for zod v3/v4 issue) — sourced from official docs and direct inspection

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (stable tooling; re-verify Claude Code plugin spec if Claude Code major version changes)
