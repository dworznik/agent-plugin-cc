import type { HookSet, SessionData, LogEntry } from '../types.js';
import { loadSession as storeLoadSession, saveSession as storeSaveSession } from '../session/store.js';
import { validatePluginDataDir } from '../config/loader.js';

// Default hook implementations (per D-03)
export const defaultHooks: HookSet = {
  buildAgentEnv: (_agentId: string, baseEnv: Record<string, string>): Record<string, string> => baseEnv,
  resolveInstructions: (_agentId: string, prompt: string): string => prompt,
  loadSession: (workspaceRoot: string, agentId: string): SessionData | null => {
    const pluginDataDir = validatePluginDataDir();
    return storeLoadSession(pluginDataDir, workspaceRoot, agentId, console.warn);
  },
  saveSession: (workspaceRoot: string, agentId: string, session: SessionData): void => {
    const pluginDataDir = validatePluginDataDir();
    storeSaveSession(pluginDataDir, workspaceRoot, agentId, session);
  },
  emitLog: (_entry: LogEntry): void => {},
};
