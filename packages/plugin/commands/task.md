---
description: Run a local AI agent task
argument-hint: '--agent <id> [--background] [--fresh] [--resume] <prompt>'
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" task $ARGUMENTS`
