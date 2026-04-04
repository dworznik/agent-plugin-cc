import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getSessionPath } from './paths.js';
import type { SessionData } from '../types.js';

// Load session from disk (per SESS-02). Returns null if not found.
// Corrupt files trigger warning + deletion per D-09.
export function loadSession(
  pluginDataDir: string,
  workspaceRoot: string,
  agentId: string,
  warn?: (msg: string) => void,
): SessionData | null {
  const path = getSessionPath(pluginDataDir, workspaceRoot, agentId);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    warn?.(`Corrupt session file at ${path}, deleting and starting fresh`);
    try {
      unlinkSync(path);
    } catch {
      /* ignore if already gone */
    }
    return null;
  }
}

// Save session to disk (per SESS-01). Creates directories recursively.
export function saveSession(
  pluginDataDir: string,
  workspaceRoot: string,
  agentId: string,
  session: SessionData,
): void {
  const path = getSessionPath(pluginDataDir, workspaceRoot, agentId);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(session, null, 2), 'utf-8');
}

// Delete session file (per SESS-03 --fresh).
export function deleteSession(
  pluginDataDir: string,
  workspaceRoot: string,
  agentId: string,
): void {
  const path = getSessionPath(pluginDataDir, workspaceRoot, agentId);
  if (existsSync(path)) unlinkSync(path);
}
