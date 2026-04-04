import { loadConfig, ConfigNotFoundError, ConfigValidationError } from '@agent-plugin-cc/runtime';
import type { AgentConfig } from '@agent-plugin-cc/runtime';

export async function listCommand(_args: string[]): Promise<void> {
  let config;
  try {
    config = loadConfig(process.cwd());
  } catch (err) {
    if (err instanceof ConfigNotFoundError) {
      console.log(JSON.stringify({ error: 'No agents.json found. Run /agents:setup to configure agents.' }));
      process.exit(1);
    }
    if (err instanceof ConfigValidationError) {
      console.log(JSON.stringify({ error: err.message }));
      process.exit(1);
    }
    throw err;
  }

  const agents = config.agents.map((a: AgentConfig) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    adapterType: a.adapterType,
  }));

  console.log(JSON.stringify({ agents, defaultAgent: config.defaultAgent ?? null }));
}
