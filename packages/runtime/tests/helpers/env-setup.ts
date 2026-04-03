import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach } from 'vitest';

let testDataDir: string;

export function useTestPluginData() {
  beforeEach(() => {
    testDataDir = mkdtempSync(join(tmpdir(), 'agent-plugin-cc-test-'));
    process.env['CLAUDE_PLUGIN_DATA'] = testDataDir;
  });
  afterEach(() => {
    delete process.env['CLAUDE_PLUGIN_DATA'];
    rmSync(testDataDir, { recursive: true, force: true });
  });
  return { getDir: () => testDataDir };
}
