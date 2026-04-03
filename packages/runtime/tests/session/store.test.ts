import { describe, it, expect } from 'vitest';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { useTestPluginData } from '../helpers/env-setup.js';
import { loadSession, saveSession, deleteSession } from '../../src/session/store.js';
import { getSessionPath } from '../../src/session/paths.js';
import { workspaceHash } from '../../src/session/hash.js';
import type { SessionData } from '../../src/types.js';

const WORKSPACE_ROOT = '/test/workspace';
const AGENT_ID = 'test-agent';

function makeSession(overrides?: Partial<SessionData>): SessionData {
  return {
    agentId: AGENT_ID,
    adapterType: 'claude_local',
    sessionId: 'sess-abc123',
    createdAt: '2026-04-04T00:00:00.000Z',
    updatedAt: '2026-04-04T00:00:00.000Z',
    ...overrides,
  };
}

describe('session store', () => {
  const { getDir } = useTestPluginData();

  it('saveSession creates session file at correct path', () => {
    const session = makeSession();
    saveSession(getDir(), WORKSPACE_ROOT, AGENT_ID, session);

    const expectedPath = getSessionPath(getDir(), WORKSPACE_ROOT, AGENT_ID);
    expect(existsSync(expectedPath)).toBe(true);
  });

  it('loadSession returns saved session data', () => {
    const session = makeSession();
    saveSession(getDir(), WORKSPACE_ROOT, AGENT_ID, session);

    const loaded = loadSession(getDir(), WORKSPACE_ROOT, AGENT_ID);
    expect(loaded).toEqual(session);
  });

  it('loadSession returns null when no session exists', () => {
    const result = loadSession(getDir(), WORKSPACE_ROOT, 'nonexistent-agent');
    expect(result).toBeNull();
  });

  it('loadSession returns null and deletes corrupt session file (per D-09)', () => {
    const path = getSessionPath(getDir(), WORKSPACE_ROOT, AGENT_ID);
    // Create corrupt file manually
    mkdirSync(join(getDir(), 'state', workspaceHash(WORKSPACE_ROOT), 'sessions'), { recursive: true });
    writeFileSync(path, '{ not valid json !!!', 'utf-8');

    const warnings: string[] = [];
    const result = loadSession(getDir(), WORKSPACE_ROOT, AGENT_ID, (msg) => warnings.push(msg));

    expect(result).toBeNull();
    expect(existsSync(path)).toBe(false);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('Corrupt session file');
  });

  it('deleteSession removes session file', () => {
    const session = makeSession();
    saveSession(getDir(), WORKSPACE_ROOT, AGENT_ID, session);

    const path = getSessionPath(getDir(), WORKSPACE_ROOT, AGENT_ID);
    expect(existsSync(path)).toBe(true);

    deleteSession(getDir(), WORKSPACE_ROOT, AGENT_ID);
    expect(existsSync(path)).toBe(false);
  });

  it('deleteSession is a no-op when file does not exist', () => {
    // Should not throw
    expect(() => deleteSession(getDir(), WORKSPACE_ROOT, 'never-saved-agent')).not.toThrow();
  });

  it('sessions for different workspace roots go to different hash directories (per SESS-04)', () => {
    const session = makeSession();
    const workspace1 = '/project/alpha';
    const workspace2 = '/project/beta';

    saveSession(getDir(), workspace1, AGENT_ID, session);
    saveSession(getDir(), workspace2, AGENT_ID, session);

    const path1 = getSessionPath(getDir(), workspace1, AGENT_ID);
    const path2 = getSessionPath(getDir(), workspace2, AGENT_ID);

    // Different paths
    expect(path1).not.toBe(path2);

    // Different hash directories
    const hash1 = workspaceHash(workspace1);
    const hash2 = workspaceHash(workspace2);
    expect(hash1).not.toBe(hash2);

    // Both files exist
    expect(existsSync(path1)).toBe(true);
    expect(existsSync(path2)).toBe(true);
  });
});
