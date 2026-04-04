import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AgentsConfigSchema } from '@agent-plugin-cc/runtime';

export async function setupCommand(args: string[]): Promise<void> {
  // Parse --config flag
  const configIdx = args.indexOf('--config');
  if (configIdx === -1 || configIdx + 1 >= args.length) {
    console.log(JSON.stringify({ error: "Usage: setup --config '<json>'" }));
    process.exit(1);
  }
  const rawJson = args[configIdx + 1];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.log(JSON.stringify({ error: 'Invalid JSON in --config argument' }));
    process.exit(1);
  }

  // Validate against schema
  const result = AgentsConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.errors[0];
    const fieldPath = issue?.path.join('.') || '(root)';
    const message = issue?.message ?? 'Validation failed';
    console.log(JSON.stringify({ error: `Validation failed at '${fieldPath}': ${message}` }));
    process.exit(1);
  }

  // Write to .claude/agents.json relative to cwd
  const outPath = join(process.cwd(), '.claude', 'agents.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(result.data, null, 2), 'utf-8');

  console.log(JSON.stringify({ success: true, path: outPath, agents: result.data.agents.length }));
}
