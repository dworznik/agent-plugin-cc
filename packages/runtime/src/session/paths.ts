import { join } from 'node:path';
import { workspaceHash } from './hash.js';

// Base state path: CLAUDE_PLUGIN_DATA/state/<sha256(workspaceRoot)>
export function getStatePath(pluginDataDir: string, workspaceRoot: string): string {
  return join(pluginDataDir, 'state', workspaceHash(workspaceRoot));
}

// Session file: .../sessions/<agent-id>.json (per SESS-01, D-08)
export function getSessionPath(pluginDataDir: string, workspaceRoot: string, agentId: string): string {
  return join(getStatePath(pluginDataDir, workspaceRoot), 'sessions', `${agentId}.json`);
}

// Log file: .../logs/<job-id>.log (per LOG-01)
export function getLogPath(pluginDataDir: string, workspaceRoot: string, jobId: string): string {
  return join(getStatePath(pluginDataDir, workspaceRoot), 'logs', `${jobId}.log`);
}
