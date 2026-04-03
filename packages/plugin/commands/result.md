---
description: Retrieve result of a completed agent job
argument-hint: '<job-id>'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" result $ARGUMENTS`
