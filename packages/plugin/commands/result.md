---
description: Retrieve result of a completed agent job
argument-hint: '<job-id>'
allowed-tools: Bash(node:*)
---

You are retrieving the result of a completed background agent job.

## Step 1: Invoke the Companion

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" result <job-id>
```

Where `<job-id>` is taken from `$ARGUMENTS`.

## Step 2: Present the Result

Parse the JSON response.

- If `output` is present, display the agent's full output inline.
- If `error` is present, display it clearly. Common reasons: job not yet completed, job not found, job failed without output.
