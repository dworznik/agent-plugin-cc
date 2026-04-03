---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` at workspace root + `packages/plugin/vitest.config.ts` |
| **Quick run command** | `vitest run --project packages/plugin` |
| **Full suite command** | `vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `vitest run --project packages/plugin`
- **After every plan wave:** Run `vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + lint clean + `npm pack` Paperclip-free check
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | LAYOUT-01 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | LAYOUT-02 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 1 | LAYOUT-03 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 1 | LAYOUT-04 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-01-05 | 01 | 1 | LAYOUT-05 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-01-06 | 01 | 1 | LAYOUT-06 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | ADPT-01 | CI check | `npm run lint && cd packages/plugin && npm pack --dry-run` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | TEST-04 | unit | `vitest run --project packages/plugin` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/plugin/tests/layout.test.ts` — stubs for LAYOUT-01 through LAYOUT-06, TEST-04
- [ ] `packages/plugin/vitest.config.ts` — test config for plugin package
- [ ] `vitest.config.ts` (root) — workspace projects configuration
- [ ] `eslint.config.mjs` (root) — flat config with no-restricted-imports rule
- [ ] Framework install: `npm install` — run after workspace package.json files are created

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm pack tarball has zero paperclip refs | ADPT-01 | Requires npm pack output inspection | Run `cd packages/plugin && npm pack --dry-run 2>&1 \| grep -i paperclip` — expect empty output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
