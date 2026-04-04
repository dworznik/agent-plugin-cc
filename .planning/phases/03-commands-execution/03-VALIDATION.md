---
phase: 3
slug: commands-execution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x |
| **Config file** | `packages/plugin/vitest.config.ts`, `packages/runtime/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @agent-plugin-cc/plugin test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @agent-plugin-cc/plugin test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | TEST-03 | unit | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | CONF-05, CONF-06 | unit | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 1 | CMD-01, CMD-02, CMD-03, CMD-04 | integration | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | JOB-01, JOB-02, JOB-03, JOB-04, JOB-05, JOB-06, JOB-07 | integration | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 2 | CMD-05, CMD-06, CMD-07, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, CMD-13 | integration | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 3 | DELEG-01, DELEG-02, DELEG-03 | unit | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |
| 03-07-01 | 07 | 3 | ERR-01, ERR-02, ERR-04 | unit | `pnpm --filter @agent-plugin-cc/plugin test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/plugin/tests/companion/setup.test.ts` — stubs for CONF-05, CONF-06
- [ ] `packages/plugin/tests/companion/task.test.ts` — stubs for CMD-01 through CMD-04
- [ ] `packages/plugin/tests/companion/job.test.ts` — stubs for JOB-01 through JOB-07
- [ ] `packages/plugin/tests/companion/commands.test.ts` — stubs for CMD-05 through CMD-13
- [ ] `packages/plugin/tests/companion/delegation.test.ts` — stubs for DELEG-01 through DELEG-03
- [ ] `packages/plugin/tests/companion/errors.test.ts` — stubs for ERR-01, ERR-02, ERR-04

*Existing vitest infrastructure from Phase 2 covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive setup wizard prompts | CONF-05 | Requires TTY interaction | Run `/agents:setup` manually, verify prompts appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
