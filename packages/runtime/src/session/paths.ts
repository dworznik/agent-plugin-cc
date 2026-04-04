import { join } from 'node:path';
import sanitize from 'sanitize-filename';
import { workspaceHash } from './hash.js';

function safeId(id: string, label: string): string {
  const clean = sanitize(id);
  if (!clean) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(id)}`);
  }
  return clean;
}

// Base state path: CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>
export function getStatePath(pluginDataDir: string, workspaceRoot: string): string {
  return join(pluginDataDir, 'state', workspaceHash(workspaceRoot));
}

// Session file: .../sessions/<agent-id>.json (per SESS-01, D-08)
export function getSessionPath(pluginDataDir: string, workspaceRoot: string, agentId: string): string {
  return join(getStatePath(pluginDataDir, workspaceRoot), 'sessions', `${safeId(agentId, 'agentId')}.json`);
}

// Log file: .../logs/<job-id>.log (per LOG-01)
export function getLogPath(pluginDataDir: string, workspaceRoot: string, jobId: string): string {
  return join(getStatePath(pluginDataDir, workspaceRoot), 'logs', `${safeId(jobId, 'jobId')}.log`);
}
