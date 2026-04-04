import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runCompanion } from './helpers/companion-runner.js';
import { useTempEnv, writeAgentsConfig } from './helpers/temp-env.js';
import { writeJob, getResultPath } from '../src/companion/job.js';
import type { JobMetadata } from '../src/companion/job.js';
import { getStatePath } from '@agent-plugin-cc/runtime';

const COMPANION_PATH = join(__dirname, '..', 'scripts', 'agents-companion.cjs');

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

function seedJob(
  statePath: string,
  overrides: Partial<JobMetadata> = {},
): string {
  const jobId = randomUUID();
  writeJob(statePath, {
    jobId,
    agentId: 'test-agent',
    status: 'completed',
    startTime: new Date().toISOString(),
    pid: 1234,
    ...overrides,
  });
  return jobId;
}

function seedResult(statePath: string, jobId: string, output: string): void {
  const p = getResultPath(statePath, jobId);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, output, 'utf-8');
}

/**
 * Get resolved paths. On macOS, mkdtempSync returns /var/... but process.cwd()
 * in the child returns /private/var/... We need to match the child's hash.
 */
function getResolvedEnv(workspaceDir: string, pluginDataDir: string) {
  const resolvedWorkspace = realpathSync(workspaceDir);
  const resolvedPluginData = realpathSync(pluginDataDir);
  return {
    resolvedWorkspace,
    resolvedPluginData,
    statePath: getStatePath(resolvedPluginData, resolvedWorkspace),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// status
// ─────────────────────────────────────────────────────────────────────────────
describe('companion status', () => {
  const { getEnv } = useTempEnv();

  it('returns job metadata JSON for a valid completed job', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath);

    const result = await runCompanion(['status', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.['jobId']).toBe(jobId);
    expect(result.json?.['status']).toBe('completed');
    expect(result.json?.['agentId']).toBe('test-agent');
    expect(result.json?.['startTime']).toBeDefined();
  });

  it('returns error JSON for unknown job id', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData } = getResolvedEnv(workspaceDir, pluginDataDir);

    const result = await runCompanion(['status', 'nonexistent-uuid'], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job not found/i);
  });

  it('returns usage error when no job-id argument is provided', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData } = getResolvedEnv(workspaceDir, pluginDataDir);

    const result = await runCompanion(['status'], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Usage: status <job-id>/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// result
// ─────────────────────────────────────────────────────────────────────────────
describe('companion result', () => {
  const { getEnv } = useTempEnv();

  it('returns output JSON for a completed job with result file', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath, { status: 'completed' });
    seedResult(statePath, jobId, 'hello from agent');

    const result = await runCompanion(['result', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.['jobId']).toBe(jobId);
    expect(result.json?.['output']).toBe('hello from agent');
  });

  it('returns error JSON when job is still running', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath, { status: 'running' });

    const result = await runCompanion(['result', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job not completed/i);
  });

  it('returns error JSON when job has failed', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath, { status: 'failed', error: 'adapter crashed' });

    const result = await runCompanion(['result', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job failed/i);
    expect(result.json?.['error']).toMatch(/adapter crashed/i);
  });

  it('returns error JSON for unknown job id', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData } = getResolvedEnv(workspaceDir, pluginDataDir);

    const result = await runCompanion(['result', 'nonexistent-uuid'], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job not found/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cancel
// ─────────────────────────────────────────────────────────────────────────────
describe('companion cancel', () => {
  const { getEnv } = useTempEnv();

  it('cancels a running job and returns cancelled status', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath, { status: 'running' });

    const result = await runCompanion(['cancel', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.['jobId']).toBe(jobId);
    expect(result.json?.['status']).toBe('cancelled');
  });

  it('returns error JSON when cancelling a completed job', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData, statePath } = getResolvedEnv(workspaceDir, pluginDataDir);
    const jobId = seedJob(statePath, { status: 'completed' });

    const result = await runCompanion(['cancel', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Cannot cancel job in 'completed' state/i);
  });

  it('returns error JSON for unknown job id', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const { resolvedWorkspace, resolvedPluginData } = getResolvedEnv(workspaceDir, pluginDataDir);

    const result = await runCompanion(['cancel', 'nonexistent-uuid'], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job not found/i);
  });
});
