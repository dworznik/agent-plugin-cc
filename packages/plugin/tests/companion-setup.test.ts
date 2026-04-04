import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCompanion } from './helpers/companion-runner.js';
import { useTempEnv } from './helpers/temp-env.js';

const COMPANION_PATH = join(__dirname, '..', 'scripts', 'agents-companion.cjs');

beforeAll(() => {
  if (!existsSync(COMPANION_PATH)) {
    throw new Error(
      `agents-companion.cjs not found at ${COMPANION_PATH}. Run 'pnpm build' first.`,
    );
  }
});

const VALID_CONFIG = JSON.stringify({
  agents: [
    {
      id: 'test',
      label: 'Test',
      description: 'A test agent',
      adapterType: 'claude_local',
    },
  ],
});

describe('companion setup', () => {
  const { getEnv } = useTempEnv();

  it('writes agents.json and returns success JSON for valid config', async () => {
    const { workspaceDir } = getEnv();
    const result = await runCompanion(['setup', '--config', VALID_CONFIG], {
      cwd: workspaceDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.json).not.toBeNull();
    expect(result.json?.['success']).toBe(true);
    expect(result.json?.['agents']).toBe(1);

    const agentsPath = join(workspaceDir, '.claude', 'agents.json');
    expect(existsSync(agentsPath)).toBe(true);

    const written = JSON.parse(readFileSync(agentsPath, 'utf-8')) as {
      agents: Array<{ id: string }>;
    };
    expect(written.agents).toHaveLength(1);
    expect(written.agents[0]?.id).toBe('test');
  });

  it('returns validation error JSON for empty agents array (min 1)', async () => {
    const { workspaceDir } = getEnv();
    const config = JSON.stringify({ agents: [] });

    const result = await runCompanion(['setup', '--config', config], {
      cwd: workspaceDir,
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Validation failed/i);
  });

  it('returns JSON error for invalid JSON in --config', async () => {
    const { workspaceDir } = getEnv();

    const result = await runCompanion(['setup', '--config', 'not-json'], {
      cwd: workspaceDir,
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Invalid JSON/i);
  });

  it('returns usage error JSON when --config flag is missing', async () => {
    const { workspaceDir } = getEnv();

    const result = await runCompanion(['setup'], { cwd: workspaceDir });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Usage: setup/i);
  });
});
