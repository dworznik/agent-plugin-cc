import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runCompanion } from './helpers/companion-runner.js';
import { useTempEnv, writeAgentsConfig } from './helpers/temp-env.js';

const COMPANION_PATH = join(__dirname, '..', 'scripts', 'agents-companion.cjs');
const SHIMS_DIR = resolve(__dirname, 'fixtures', 'shims');

beforeAll(() => {
  if (!existsSync(COMPANION_PATH)) {
    throw new Error(
      `agents-companion.cjs not found at ${COMPANION_PATH}. Run 'pnpm build' first.`,
    );
  }
});

const VALID_AGENTS_CONFIG = {
  defaultAgent: 'test-agent',
  agents: [
    {
      id: 'test-agent',
      label: 'Test Agent',
      description: 'A test agent for integration testing',
      adapterType: 'claude_local',
    },
  ],
};

describe('companion task', () => {
  const { getEnv } = useTempEnv();

  it('foreground: returns output JSON with valid config and shim on PATH', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const result = await runCompanion(['task', '--agent', 'test-agent', 'do something'], {
      cwd: resolvedWorkspace,
      env: {
        CLAUDE_PLUGIN_DATA: resolvedPluginData,
        __ADAPTER_TEST_MODE: 'success',
        PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json).not.toBeNull();
    expect(typeof result.json?.['output']).toBe('string');
    expect((result.json?.['output'] as string).length).toBeGreaterThan(0);
  });

  it('returns error JSON when agent id not found in config', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const result = await runCompanion(['task', '--agent', 'nonexistent', 'do something'], {
      cwd: resolvedWorkspace,
      env: {
        CLAUDE_PLUGIN_DATA: resolvedPluginData,
        __ADAPTER_TEST_MODE: 'success',
        PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Agent not found: nonexistent/i);
  });

  it('returns error JSON when no agents.json config found', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    // No config written — workspaceDir is empty

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const result = await runCompanion(['task', '--agent', 'test-agent', 'do something'], {
      cwd: resolvedWorkspace,
      env: {
        CLAUDE_PLUGIN_DATA: resolvedPluginData,
        __ADAPTER_TEST_MODE: 'success',
        PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/No agents\.json found/i);
  });

  it('returns error JSON when --agent flag is missing', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const result = await runCompanion(['task', 'do something'], {
      cwd: resolvedWorkspace,
      env: {
        CLAUDE_PLUGIN_DATA: resolvedPluginData,
        PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toBeDefined();
    expect(typeof result.json?.['error']).toBe('string');
  });
});
