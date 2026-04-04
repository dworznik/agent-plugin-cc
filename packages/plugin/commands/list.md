---
description: List configured local AI agents
argument-hint: ""
allowed-tools: Bash(node:*)
---

You are listing the configured local AI agents for this workspace.

## Step 1: Fetch the Agent List

Run:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" list
```

## Step 2: Present the Results

Parse the JSON response.

- If an `error` field is present, display the error message to the user.
- If an `agents` array is present, display it as a markdown table with columns:

  | ID | Label | Description | Adapter Type |
  |----|-------|-------------|--------------|

- If the response includes a `defaultAgent` field, mention it below the table:
  > Default agent: `<defaultAgent>`

- If the `agents` array is empty or missing, tell the user no agents are configured and suggest running `/agents:setup`.
