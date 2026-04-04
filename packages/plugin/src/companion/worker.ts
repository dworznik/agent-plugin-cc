#!/usr/bin/env node
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  validatePluginDataDir,
  getStatePath,
  getLogPath,
  createLogger,
  defaultHooks,
  ClaudeLocalAdapter,
  CodexLocalAdapter,
  CursorAdapter,
  GeminiLocalAdapter,
  OpencodeLocalAdapter,
  PiLocalAdapter,
} from '@agent-plugin-cc/runtime';
import type { AgentConfig, BaseAdapter } from '@agent-plugin-cc/runtime';
import { updateJob, getResultPath, getCancelPath } from './job.js';

const [jobId, agentId, prompt, agentJson] = process.argv.slice(2);
const agent: AgentConfig = JSON.parse(agentJson);

const pluginDataDir = validatePluginDataDir();
const cwd = process.cwd();
const statePath = getStatePath(pluginDataDir, cwd);
const logPath = getLogPath(pluginDataDir, cwd, jobId);
const logger = createLogger(jobId, logPath, defaultHooks.emitLog);

updateJob(statePath, jobId, { status: 'running', pid: process.pid });
logger.info('Worker started');

function createAdapter(agentCfg: AgentConfig): BaseAdapter {
  switch (agentCfg.adapterType) {
    case 'claude_local':   return new ClaudeLocalAdapter();
    case 'codex_local':    return new CodexLocalAdapter();
    case 'cursor':         return new CursorAdapter();
    case 'gemini_local':   return new GeminiLocalAdapter();
    case 'opencode_local': return new OpencodeLocalAdapter();
    case 'pi_local':       return new PiLocalAdapter();
  }
}

const startMs = Date.now();
let cancelled = false;

const cancelPath = getCancelPath(statePath, jobId);
const pollInterval = setInterval(() => {
  if (existsSync(cancelPath)) {
    clearInterval(pollInterval);
    cancelled = true;
    logger.warn('Cancel sentinel detected, exiting');
    process.exit(0);
  }
}, 1000);

(async () => {
  try {
    const adapter = createAdapter(agent);
    const env = defaultHooks.buildAgentEnv(agentId, { ...(process.env as Record<string, string>) });
    const result = await adapter.execute(prompt, { cwd, env });

    clearInterval(pollInterval);

    if (cancelled) {
      process.exit(0);
    }

    // Write result file (JOB-04)
    const resultPath = getResultPath(statePath, jobId);
    mkdirSync(dirname(resultPath), { recursive: true });
    writeFileSync(resultPath, result.output, 'utf-8');

    // Save session if adapter returned one
    if (result.sessionId) {
      defaultHooks.saveSession(cwd, agentId, {
        agentId,
        adapterType: agent.adapterType,
        sessionId: result.sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Update job to completed
    updateJob(statePath, jobId, { status: 'completed', endTime: new Date().toISOString() });
    logger.info('Job completed', Date.now() - startMs);
  } catch (err) {
    clearInterval(pollInterval);

    if (cancelled) {
      process.exit(0);
    }

    // JOB-05, ERR-04: write error to job metadata
    const errorMsg = (err as Error).message ?? String(err);
    updateJob(statePath, jobId, { status: 'failed', endTime: new Date().toISOString(), error: errorMsg });
    logger.error(`Job failed: ${errorMsg}`);
    process.exit(1);
  }
})();
