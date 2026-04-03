---
phase: 2
slug: runtime-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `packages/runtime/vitest.config.ts` (Wave 0 — needs creation) |
| **Quick run command** | `npm test --workspace packages/runtime` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace packages/runtime`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | CONF-01 | unit | `npm test --workspace packages/runtime -- --testPathPattern config/schema` | No — W0 | pending |
| 02-01-02 | 01 | 1 | CONF-02 | unit | `npm test --workspace packages/runtime -- --testPathPattern config/loader` | No — W0 | pending |
| 02-01-03 | 01 | 1 | CONF-03 | unit | (same as CONF-01) | No — W0 | pending |
| 02-01-04 | 01 | 1 | CONF-04 | unit | (same as CONF-02) | No — W0 | pending |
| 02-02-01 | 02 | 1 | ADPT-02 | unit | `npm test --workspace packages/runtime -- --testPathPattern hooks` | No — W0 | pending |
| 02-02-02 | 02 | 1 | ADPT-09 | unit | `npm test --workspace packages/runtime -- --testPathPattern process/runner` | No — W0 | pending |
| 02-02-03 | 02 | 1 | ADPT-10 | unit | `npm test --workspace packages/runtime -- --testPathPattern process/parse` | No — W0 | pending |
| 02-03-01 | 03 | 2 | ADPT-03 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/claude` | No — W0 | pending |
| 02-03-02 | 03 | 2 | ADPT-04 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/codex` | No — W0 | pending |
| 02-03-03 | 03 | 2 | ADPT-05 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/cursor` | No — W0 | pending |
| 02-03-04 | 03 | 2 | ADPT-06 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/gemini` | No — W0 | pending |
| 02-03-05 | 03 | 2 | ADPT-07 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/opencode` | No — W0 | pending |
| 02-03-06 | 03 | 2 | ADPT-08 | smoke | `npm test --workspace packages/runtime -- --testPathPattern adapters/pi` | No — W0 | pending |
| 02-04-01 | 04 | 2 | SESS-01 | unit | `npm test --workspace packages/runtime -- --testPathPattern session/store` | No — W0 | pending |
| 02-04-02 | 04 | 2 | SESS-02 | unit | (same as SESS-01) | No — W0 | pending |
| 02-04-03 | 04 | 2 | SESS-03 | unit | (same as SESS-01) | No — W0 | pending |
| 02-04-04 | 04 | 2 | SESS-04 | unit | (same as SESS-01) | No — W0 | pending |
| 02-04-05 | 04 | 2 | ERR-05 | unit | (same as SESS-01 — env stub) | No — W0 | pending |
| 02-05-01 | 05 | 2 | LOG-01 | unit | `npm test --workspace packages/runtime -- --testPathPattern logging` | No — W0 | pending |
| 02-05-02 | 05 | 2 | LOG-02 | unit | (same as LOG-01) | No — W0 | pending |
| 02-05-03 | 05 | 2 | LOG-03 | unit | (same as LOG-01) | No — W0 | pending |
| 02-05-04 | 05 | 2 | ERR-03 | unit | `npm test --workspace packages/runtime -- --testPathPattern adapters/claude` (error scenario) | No — W0 | pending |

---

## Wave 0 Requirements

- [ ] `packages/runtime/vitest.config.ts` — vitest config for runtime package
- [ ] `packages/runtime/package.json` — add `"test": "vitest run"` script and vitest devDependency
- [ ] `packages/runtime/tests/` — test directory tree
- [ ] `packages/runtime/tests/fixtures/shims/` — six fake CLI shell scripts with chmod +x
- [ ] `packages/runtime/tests/helpers/path-override.ts` — PATH injection helper for shim tests

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
