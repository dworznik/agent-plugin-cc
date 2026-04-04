import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCompanion } from './helpers/companion-runner.js';
import { useTempEnv, writeAgentsConfig } from './helpers/temp-env.js';

const COMPANION_PATH = join(__dirname, '..', 'scripts', 'agents-companion.cjs');

beforeAll(() => {
  if (!existsSync(COMPANION_PATH)) {
    throw new Error(
      `agents-companion.cjs not found at ${COMPANION_PATH}. Run 'pnpm build' first.`,
    );
  }
});

const VALID_AGENTS_CONFIG = {
  defaultAgent: 'test',
  agents: [
    {
      id: 'test',
      label: 'Test Agent',
      description: 'A test agent',
      adapterType: 'claude_local',
    },
  ],
};

describe('companion list', () => {
  const { getEnv } = useTempEnv();

  it('returns agents array JSON with correct fields when valid config exists', async () => {
    const { workspaceDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const result = await runCompanion(['list'], { cwd: workspaceDir });

    expect(result.exitCode).toBe(0);
    expect(result.json).not.toBeNull();

    const agents = result.json?.['agents'] as Array<Record<string, unknown>>;
    expect(Array.isArray(agents)).toBe(true);
    expect(agents).toHaveLength(1);
    expect(agents[0]?.['id']).toBe('test');
    expect(agents[0]?.['label']).toBe('Test Agent');
    expect(agents[0]?.['description']).toBe('A test agent');
    expect(agents[0]?.['adapterType']).toBe('claude_local');
    expect(result.json?.['defaultAgent']).toBe('test');
  });

  it('returns JSON error with exit code 1 when no agents.json found', async () => {
    const { workspaceDir } = getEnv();
    // No config written — workspaceDir is empty

    const result = await runCompanion(['list'], { cwd: workspaceDir });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/No agents\.json found/i);
  });

  it('returns JSON validation error with exit code 1 for invalid agents.json', async () => {
    const { workspaceDir } = getEnv();
    // Write an invalid config (missing required fields)
    const claudeDir = join(workspaceDir, '.claude');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'agents.json'), JSON.stringify({ agents: [] }), 'utf-8');

    const result = await runCompanion(['list'], { cwd: workspaceDir });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toBeDefined();
    expect(typeof result.json?.['error']).toBe('string');
  });
});
