import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { useTestPluginData } from '../helpers/env-setup.js';
import { defaultHooks } from '../../src/hooks/defaults.js';
import { getSessionPath } from '../../src/session/paths.js';
import type { HookSet, SessionData, LogEntry } from '../../src/types.js';

const WORKSPACE_ROOT = '/test/workspace';
const AGENT_ID = 'test-agent';

function makeSession(overrides?: Partial<SessionData>): SessionData {
  return {
    agentId: AGENT_ID,
    adapterType: 'claude_local',
    sessionId: 'sess-xyz789',
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('defaultHooks', () => {
  // Compile-time check: defaultHooks must satisfy HookSet interface
  const _typeCheck: HookSet = defaultHooks;
  void _typeCheck;

  const { getDir } = useTestPluginData();

  it('buildAgentEnv passes through base env unchanged', () => {
    const baseEnv = { FOO: 'bar', HOME: '/home/user' };
    const result = defaultHooks.buildAgentEnv(AGENT_ID, baseEnv);
    expect(result).toEqual(baseEnv);
    expect(result).toBe(baseEnv); // same reference — no copy
  });

  it('resolveInstructions passes through prompt unchanged', () => {
    const prompt = 'Please write a test for the session store.';
    const result = defaultHooks.resolveInstructions(AGENT_ID, prompt);
    expect(result).toBe(prompt);
  });

  it('loadSession returns null when no session exists', () => {
    const result = defaultHooks.loadSession(WORKSPACE_ROOT, 'nonexistent-agent');
    expect(result).toBeNull();
  });

  it('saveSession creates a session file and loadSession retrieves it', () => {
    const session = makeSession();

    defaultHooks.saveSession(WORKSPACE_ROOT, AGENT_ID, session);

    const path = getSessionPath(getDir(), WORKSPACE_ROOT, AGENT_ID);
    expect(existsSync(path)).toBe(true);

    const loaded = defaultHooks.loadSession(WORKSPACE_ROOT, AGENT_ID);
    expect(loaded).toEqual(session);
  });

  it('emitLog is callable and does not throw (no-op)', () => {
    const entry: LogEntry = {
      timestamp: '2026-04-04T00:00:00.000Z',
      level: 'info',
      jobId: 'job-001',
      message: 'Test log entry',
    };
    expect(() => defaultHooks.emitLog(entry)).not.toThrow();
  });

  it('emitLog accepts entry with optional durationMs', () => {
    const entry: LogEntry = {
      timestamp: '2026-04-04T00:00:00.000Z',
      level: 'info',
      jobId: 'job-002',
      message: 'Adapter completed',
      durationMs: 1234,
    };
    expect(() => defaultHooks.emitLog(entry)).not.toThrow();
  });
});
