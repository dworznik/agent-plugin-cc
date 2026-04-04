import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach } from 'vitest';

export interface TestEnv {
  tmpDir: string;
  pluginDataDir: string;
  workspaceDir: string;
}

let currentEnv: TestEnv | null = null;

export function useTempEnv(): { getEnv: () => TestEnv } {
  beforeEach(() => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'companion-test-'));
    const pluginDataDir = join(tmpDir, 'plugin-data');
    const workspaceDir = join(tmpDir, 'workspace');
    mkdirSync(pluginDataDir, { recursive: true });
    mkdirSync(workspaceDir, { recursive: true });
    currentEnv = { tmpDir, pluginDataDir, workspaceDir };
  });

  afterEach(() => {
    if (currentEnv) {
      rmSync(currentEnv.tmpDir, { recursive: true, force: true });
      currentEnv = null;
    }
  });

  return {
    getEnv: () => {
      if (!currentEnv) throw new Error('Test env not initialized');
      return currentEnv;
    },
  };
}

export function writeAgentsConfig(workspaceDir: string, config: Record<string, unknown>): void {
  const dir = join(workspaceDir, '.claude');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'agents.json'), JSON.stringify(config, null, 2), 'utf-8');
}
