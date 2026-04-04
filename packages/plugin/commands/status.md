---
description: Check status of a background agent job
argument-hint: '<job-id>'
allowed-tools: Bash(node:*)
---

You are checking the status of a background agent job.

## Step 1: Invoke the Companion

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" status <job-id>
```

Where `<job-id>` is taken from `$ARGUMENTS`.

## Step 2: Present the Status

Parse the JSON response.

- If `error` is present (command-level error, e.g. job not found), display it clearly.
- Otherwise, display the job metadata in a readable format:
  - **Job ID**: `jobId`
  - **Agent**: `agentId`
  - **Status**: `status` (one of: `running`, `completed`, `failed`, `cancelled`)
  - **Started**: `startTime`
  - **Ended**: `endTime` (if set)
  - **Error**: `error` (if the job itself failed)
