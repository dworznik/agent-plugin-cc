---
description: Configure local AI agents for this workspace
argument-hint: ""
allowed-tools: Bash(node:*)
---

You are guiding the user through an interactive setup wizard to configure local AI agents for this workspace.

## Step 1: Greet the User

Explain that you will help them configure agents for this workspace. The configuration will be saved to `.claude/agents.json` and used by all `/agents:*` commands.

## Step 2: Collect Agent Details

Ask the user for each agent they want to configure. For each agent, collect:

- **id** — short identifier (e.g. `claude`, `codex`, `gemini`). Used in `--agent <id>` flag.
- **label** — human-friendly name (e.g. "Claude Sonnet", "OpenAI Codex")
- **description** — what this agent is for, used by the delegation subagent to pick the best match (e.g. "General-purpose coding assistant using Anthropic Claude")
- **adapterType** — one of: `claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`

Depending on the `adapterType`, also ask for optional fields:
- `claude_local`: `model` (string, e.g. `claude-opus-4-5`), `maxBudgetUsd` (number, e.g. `1.0`)
- `codex_local`: `provider` (string, e.g. `openai`), `model` (string, e.g. `codex-mini-latest`)
- `cursor`, `gemini_local`, `opencode_local`, `pi_local`: `model` (string)

Ask if the user wants to add another agent. Repeat until done.

## Step 3: Default Agent

Ask the user which agent should be the default (used when no `--agent` flag is specified). The value should be one of the `id` values collected above. This is optional — leave out if the user declines.

## Step 4: Assemble and Save

Assemble the full JSON configuration:

```json
{
  "agents": [
    {
      "id": "<id>",
      "label": "<label>",
      "description": "<description>",
      "adapterType": "<adapterType>",
      "adapterConfig": { ... }
    }
  ],
  "defaultAgent": "<id>"
}
```

Run the companion to save it:

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/agents-companion.cjs" setup --config '<assembled-json>'
```

## Step 5: Handle the Response

Parse the JSON response from the companion:

- If `success: true`, confirm to the user that the configuration was saved, and show the path where it was written.
- If `error` is present, display the error message clearly and offer to help the user fix it (e.g. invalid adapterType, missing required field).
