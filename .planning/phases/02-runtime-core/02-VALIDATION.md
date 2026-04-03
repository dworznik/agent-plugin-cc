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
| **Config file** | `packages/runtime/vitest.config.ts` (Plan 02-00 creates this) |
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 02-00 T1 | 00 | 1 | TEST-01 | infra | `npx vitest run` + `npx tsc --noEmit` | pending |
| 02-01 T1 | 01 | 2 | CONF-01, CONF-03, ADPT-10 | unit | `npx tsc --noEmit` | pending |
| 02-01 T2 | 01 | 2 | CONF-02, CONF-04, ADPT-09, ERR-05 | unit | `npx vitest run tests/config tests/process` | pending |
| 02-02 T1 | 02 | 3 | SESS-01..04, LOG-01..03, ADPT-02 | unit | `npx tsc --noEmit` + smoke test | pending |
| 02-02 T2 | 02 | 3 | SESS-01..04, ADPT-02, LOG-01..03 | unit | `npx vitest run tests/session tests/hooks` | pending |
| 02-03 T1 | 03 | 4 | ERR-03, LOG-02 | unit | `npx tsc --noEmit` | pending |
| 02-03 T2 | 03 | 4 | ADPT-03..08 | unit | `npx tsc --noEmit` + smoke test | pending |
| 02-04 T1 | 04 | 5 | TEST-02 | infra | `bash -n` shim syntax check | pending |
| 02-04 T2 | 04 | 5 | TEST-01, TEST-02 | smoke | `npx vitest run` (full suite) | pending |

---

## Wave 0 Requirements (Plan 02-00)

- [ ] `packages/runtime/vitest.config.ts` — vitest config for runtime package
- [ ] `packages/runtime/package.json` — add `"test": "vitest run"` script and vitest devDependency
- [ ] `packages/runtime/tsconfig.build.json` — production build config
- [ ] `packages/runtime/tests/smoke.test.ts` — infrastructure smoke test

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
