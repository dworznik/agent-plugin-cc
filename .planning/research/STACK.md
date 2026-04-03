# Stack Research

**Domain:** Claude Code plugin / Node.js CLI orchestration runtime
**Researched:** 2026-04-04
**Confidence:** HIGH (stack is constrained by project context — Node.js/TypeScript is non-negotiable; library choices are well-established patterns in this domain)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20 LTS | Runtime | Active LTS until 2026-04-30; stable `child_process`, `fs/promises`, `readline`, `crypto` — everything needed without external deps; `worker_threads` available if needed for future foreground isolation |
| TypeScript | 5.x (≥5.4) | Language | Mandated by project; TypeScript 5.4+ required for `NoInfer`, improved narrowing; provides compile-time type safety across the adapter contract boundaries that are impossible to enforce at runtime alone |
| zod | 3.x (≥3.22) | Schema validation + type inference | Single source of truth for `ConfiguredAgent`, `StoredAgentSession`, `AgentJob` shapes — schema and TypeScript types derived in one place; runtime `.parse()` gives early failure with actionable error messages at config load time; avoids maintaining separate `type X = {...}` and `schema: JSONSchema` |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 2.x | Test runner | All unit + integration tests; TypeScript-native (no `ts-jest` shim needed), runs in < 500ms for the fixture-based test suite described in the plan; use `vi.mock` for fake CLI binaries in adapter smoke tests |
| tsup | 8.x | Build / bundle | Bundle the companion script to a single self-contained `.cjs` file that can be shipped inside `.claude-plugin/scripts/`; handles CJS output correctly, tree-shakes, handles shebang lines |
| @types/node | 20.x | Node.js type declarations | Required — `child_process`, `fs`, `path`, `crypto`, `readline` types; install as devDependency alongside Node 20 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx | Run TypeScript directly during development | `npx tsx companion.ts` for rapid iteration; avoids `tsc && node` round-trips during development; use `--no-cache` in CI to avoid stale state |
| tsc | Type checking + declaration emit for the runtime package | Run as `tsc --noEmit` in CI for type-check-only pass; use `tsc -p tsconfig.build.json` for the publishable runtime package declarations |
| eslint + @typescript-eslint | Lint | Enforce no-import rules at the package boundary (e.g., no `paperclip` imports in runtime core); use `eslint-plugin-import` with `no-restricted-imports` to encode the Paperclip-free constraint as a lint error |

---

## Installation

```bash
# Runtime deps (companion + runtime package)
npm install zod

# Dev dependencies
npm install -D typescript vitest tsup tsx @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| zod | ajv | Use ajv when you need strict JSON Schema draft compliance for external tooling (e.g., VSCode schema hints in `.claude/agents.json`); zod is better when TypeScript types and runtime validation must stay in sync |
| zod | io-ts | Never — io-ts is functional-programming style and has a steep learning curve with no benefit here |
| vitest | jest | Use jest when inheriting a large existing jest codebase; for a greenfield TypeScript project in 2026, vitest is strictly better: faster, no `ts-jest` overhead, ESM-native |
| tsup | esbuild (raw) | Use raw esbuild if you need fine-grained plugin control; tsup wraps esbuild with sensible defaults and handles the CJS/ESM dual-output problem cleanly |
| tsup | tsc alone | tsc is appropriate for the *runtime package* (clean declarations, no bundling); tsup is required for the *companion script* (needs to be a single executable file) |
| Node built-in `child_process` | execa | Use execa if you need cross-platform shell quoting, promise-based `.kill()`, or verbose piping across multiple processes; the project's background-detached-worker pattern maps directly to `child_process.spawn({ detached: true, stdio: 'ignore' })` — execa adds complexity without benefit |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `find-up` v7+ | ESM-only; breaks CJS projects (`"type": "commonjs"` in package.json); mixing ESM-only deps into a CJS project causes dynamic import boilerplate throughout | Inline 8-line workspace root walk: traverse `path.dirname()` upward checking `fs.existsSync('.git')` — no external dep needed for this simple task |
| `jest` | Requires `ts-jest` or Babel transform for TypeScript; config overhead unjustified for a new project; slower cold start than vitest | vitest |
| Bun runtime | Project is committed to Node.js; Bun's child_process compatibility is close but not identical; `detached` worker behavior has edge cases on macOS; CI environments would need Bun installed | Node.js 20 LTS |
| `dotenv` | Runtime state lives under `CLAUDE_PLUGIN_DATA`, not `.env` files; env vars for adapters are built by `buildAgentEnv()` hook, not dotenv | Plugin-owned `buildAgentEnv` hook |
| `winston` / `pino` | Logging is stream-based (`emitLog` hook + JSONL files); a full logging framework adds unnecessary weight to a companion script | Node.js built-in `readline` + `fs.appendFile` for JSONL log writes |
| `@anthropic-ai/sdk` | This plugin invokes agent CLIs via child processes, not the Anthropic API directly — the Claude agent is already running the session | `child_process.spawn` |

---

## Stack Patterns by Variant

**For the runtime package (publishable, consumed by companion):**
- Compile with `tsc` (not tsup) to emit clean `.d.ts` declaration files
- Output to `dist/` with `"types"` field in package.json
- No bundling — consumers import individual modules
- Use `zod` for schema definitions and export inferred types alongside schemas

**For the companion script (executable, shipped in `.claude-plugin/scripts/`):**
- Bundle with `tsup` to a single `.cjs` file with `#!/usr/bin/env node` shebang
- Mark `zod` as external if the runtime package is also bundled (avoid double-including zod)
- Use `--minify` only in production build, not dev (minified stack traces are useless during development)

**For the plugin layout files (`marketplace.json`, `plugin.json`, command `.md` files):**
- These are plain JSON and Markdown — no build step needed
- Validate `marketplace.json` and `plugin.json` with zod schemas in the plugin layout tests

**For adapter smoke tests with fake CLIs:**
- Create fixture executables under `tests/fixtures/fake-<adapter>` with controlled stdout output
- Use vitest's `vi.spyOn(process, 'env', 'get')` to inject test env without real env vars
- Use `tmp` (OS temp dir via `os.tmpdir()`) not a fixture directory for session/job state — keeps tests hermetic

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| TypeScript@5.4+ | Node.js@20 | tsconfig `target: "ES2022"` and `module: "Node16"` for correct CJS interop |
| zod@3.22+ | TypeScript@5.0+ | zod v3 is CJS-compatible; zod v4 (alpha) breaks API — stay on v3 |
| vitest@2.x | TypeScript@5.x | Vitest 2.x requires Node 18+; fully compatible with TS 5.x |
| tsup@8.x | TypeScript@5.x | tsup uses esbuild under the hood; TypeScript is used for type-check only, not transpilation |
| @types/node@20.x | Node.js@20 | Pin major version to match Node runtime |

---

## tsconfig Recommendations

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

Use `"module": "Node16"` (not `"CommonJS"`) because it enforces explicit extensions in imports and gives better interop diagnostics — it catches the CJS/ESM boundary issues at compile time rather than runtime.

---

## Sources

- Node.js 20 LTS release schedule: https://nodejs.org/en/about/previous-releases — HIGH confidence
- zod v3 docs and CJS compatibility: training data (zod v3 is CJS-compatible, widely verified) — HIGH confidence
- vitest v2 changelog and Node 18+ requirement: training data, cross-referenced with vitest release notes pattern — MEDIUM confidence (verify `vitest@2` exact Node minimum before locking)
- tsup docs for CJS output: training data — HIGH confidence (tsup CJS output is its primary documented use case)
- `find-up` v7 ESM-only breaking change: well-documented breaking change in the Node ecosystem — HIGH confidence

---

*Stack research for: Standalone Universal Agents Plugin for Claude Code (Claude Code plugin / Node.js CLI orchestration runtime)*
*Researched: 2026-04-04*
