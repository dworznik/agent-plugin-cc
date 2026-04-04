import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, afterEach } from 'vitest';

export function useTestPluginData() {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'agent-plugin-cc-test-'));
    process.env['CLAUDE_PLUGIN_DATA'] = dir;
  });
  afterEach(() => {
    delete process.env['CLAUDE_PLUGIN_DATA'];
    rmSync(dir, { recursive: true, force: true });
  });
  return { getDir: () => dir };
}
