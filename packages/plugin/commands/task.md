---
description: Run a local AI agent task
argument-hint: '--agent <id> [--background] [--fresh] [--resume] <prompt>'
allowed-tools: Bash(node:*)
---

You are dispatching a task to a local AI agent.

## Step 1: Parse the Arguments

From `$ARGUMENTS`, extract:

- `--agent <id>` — the agent to use (required unless a `defaultAgent` is configured)
- `--background` — run as a background job (optional)
- `--fresh` — discard the existing session and start fresh (optional)
- `--resume` — explicitly resume an existing session (optional)
- Everything else is the prompt text

## Step 2: Invoke the Companion

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" task --agent <id> [--background] [--fresh] [--resume] <prompt>
```

Pass all parsed flags and the prompt text.

## Step 3: Handle the Response

Parse the JSON response.

**Foreground mode** (no `--background` flag):
- If `output` is present, display the agent's output inline.
- If `error` is present, display the error clearly.

**Background mode** (`--background` flag used):
- If `jobId` is present, confirm the job was started and display the job ID.
- Tell the user they can check progress with `/agents:status <jobId>` and retrieve the result with `/agents:result <jobId>`.
- If `error` is present, display the error clearly.
