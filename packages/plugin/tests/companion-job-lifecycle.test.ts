import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runCompanion } from './helpers/companion-runner.js';
import { useTempEnv, writeAgentsConfig } from './helpers/temp-env.js';
import type { CompanionResult } from './helpers/companion-runner.js';

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

async function pollJobStatus(
  env: { pluginDataDir: string; workspaceDir: string },
  jobId: string,
  targetStatuses: string[],
  timeoutMs = 8000,
  intervalMs = 250,
): Promise<CompanionResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await runCompanion(['status', jobId], {
      cwd: env.workspaceDir,
      env: { CLAUDE_PLUGIN_DATA: env.pluginDataDir, PATH: process.env['PATH']! },
    });
    if (result.json && targetStatuses.includes(result.json['status'] as string)) {
      return result;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Job ${jobId} did not reach ${targetStatuses.join('|')} within ${timeoutMs}ms`);
}

describe('companion job lifecycle', () => {
  const { getEnv } = useTempEnv();

  it('background dispatch returns job-id immediately (before shim finishes)', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const start = Date.now();
    const result = await runCompanion(['task', '--agent', 'test-agent', '--background', 'test prompt'], {
      cwd: resolvedWorkspace,
      env: {
        CLAUDE_PLUGIN_DATA: resolvedPluginData,
        __ADAPTER_TEST_MODE: 'success',
        __ADAPTER_TEST_DELAY: '0.5',
        PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
      },
    });
    const elapsed = Date.now() - start;

    expect(result.exitCode).toBe(0);
    expect(typeof result.json?.['jobId']).toBe('string');
    expect(result.json?.['status']).toBe('pending');
    // Should return before the 500ms shim delay completes
    expect(elapsed).toBeLessThan(2000);
  });

  it('status transitions: pending -> running -> completed', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    // Dispatch with a fast shim (no delay)
    const dispatch = await runCompanion(
      ['task', '--agent', 'test-agent', '--background', 'test prompt'],
      {
        cwd: resolvedWorkspace,
        env: {
          CLAUDE_PLUGIN_DATA: resolvedPluginData,
          __ADAPTER_TEST_MODE: 'success',
          __ADAPTER_TEST_DELAY: '0',
          PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
        },
      },
    );

    expect(dispatch.exitCode).toBe(0);
    const jobId = dispatch.json?.['jobId'] as string;
    expect(typeof jobId).toBe('string');

    // Poll until completed
    const final = await pollJobStatus(
      { workspaceDir: resolvedWorkspace, pluginDataDir: resolvedPluginData },
      jobId,
      ['completed'],
    );

    expect(final.json?.['status']).toBe('completed');
    expect(final.json?.['endTime']).toBeDefined();
  });

  it('result retrieval returns output after completion', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    // Dispatch fast job
    const dispatch = await runCompanion(
      ['task', '--agent', 'test-agent', '--background', 'test prompt'],
      {
        cwd: resolvedWorkspace,
        env: {
          CLAUDE_PLUGIN_DATA: resolvedPluginData,
          __ADAPTER_TEST_MODE: 'success',
          __ADAPTER_TEST_DELAY: '0',
          PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
        },
      },
    );

    const jobId = dispatch.json?.['jobId'] as string;

    // Wait for completion
    await pollJobStatus(
      { workspaceDir: resolvedWorkspace, pluginDataDir: resolvedPluginData },
      jobId,
      ['completed'],
    );

    // Fetch result
    const result = await runCompanion(['result', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(0);
    expect(result.json?.['jobId']).toBe(jobId);
    expect(typeof result.json?.['output']).toBe('string');
    expect((result.json?.['output'] as string).length).toBeGreaterThan(0);
  });

  it('cancel stops a running job', { timeout: 15000 }, async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    // Dispatch with 3s delay — long enough to catch while running
    const dispatch = await runCompanion(
      ['task', '--agent', 'test-agent', '--background', 'test prompt'],
      {
        cwd: resolvedWorkspace,
        env: {
          CLAUDE_PLUGIN_DATA: resolvedPluginData,
          __ADAPTER_TEST_MODE: 'success',
          __ADAPTER_TEST_DELAY: '3',
          PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
        },
      },
    );

    expect(dispatch.exitCode).toBe(0);
    const jobId = dispatch.json?.['jobId'] as string;

    // Poll until running
    await pollJobStatus(
      { workspaceDir: resolvedWorkspace, pluginDataDir: resolvedPluginData },
      jobId,
      ['running'],
    );

    // Cancel the running job
    const cancelResult = await runCompanion(['cancel', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(cancelResult.exitCode).toBe(0);
    expect(cancelResult.json?.['jobId']).toBe(jobId);
    expect(cancelResult.json?.['status']).toBe('cancelled');

    // Confirm job is marked cancelled
    const statusResult = await pollJobStatus(
      { workspaceDir: resolvedWorkspace, pluginDataDir: resolvedPluginData },
      jobId,
      ['cancelled'],
    );
    expect(statusResult.json?.['status']).toBe('cancelled');
  });

  it('cancel returns error for a completed job', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    // Dispatch fast job
    const dispatch = await runCompanion(
      ['task', '--agent', 'test-agent', '--background', 'test prompt'],
      {
        cwd: resolvedWorkspace,
        env: {
          CLAUDE_PLUGIN_DATA: resolvedPluginData,
          __ADAPTER_TEST_MODE: 'success',
          __ADAPTER_TEST_DELAY: '0',
          PATH: `${SHIMS_DIR}:${process.env['PATH'] ?? ''}`,
        },
      },
    );

    const jobId = dispatch.json?.['jobId'] as string;

    // Wait for completion
    await pollJobStatus(
      { workspaceDir: resolvedWorkspace, pluginDataDir: resolvedPluginData },
      jobId,
      ['completed'],
    );

    // Try to cancel completed job
    const cancelResult = await runCompanion(['cancel', jobId], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(cancelResult.exitCode).toBe(1);
    expect(cancelResult.json?.['error']).toMatch(/Cannot cancel job in 'completed' state/i);
  });

  it('status returns error for nonexistent job', async () => {
    const { workspaceDir, pluginDataDir } = getEnv();
    writeAgentsConfig(workspaceDir, VALID_AGENTS_CONFIG);

    const resolvedWorkspace = realpathSync(workspaceDir);
    const resolvedPluginData = realpathSync(pluginDataDir);

    const result = await runCompanion(['status', 'nonexistent-uuid'], {
      cwd: resolvedWorkspace,
      env: { CLAUDE_PLUGIN_DATA: resolvedPluginData },
    });

    expect(result.exitCode).toBe(1);
    expect(result.json?.['error']).toMatch(/Job not found/i);
  });
});
