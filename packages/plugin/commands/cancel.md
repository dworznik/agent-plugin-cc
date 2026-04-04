---
description: Cancel a running or pending agent job
argument-hint: '<job-id>'
allowed-tools: Bash(node:*)
---

You are cancelling a background agent job.

## Step 1: Invoke the Companion

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" cancel <job-id>
```

Where `<job-id>` is taken from `$ARGUMENTS`.

## Step 2: Handle the Response

Parse the JSON response.

- If `status: 'cancelled'` is present, confirm to the user that the job has been cancelled.
- If `error` is present, display it clearly. Common reasons: job not found, job already completed or cancelled.
