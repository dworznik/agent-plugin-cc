import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  findConfigPath,
  loadConfig,
  validatePluginDataDir,
  ConfigNotFoundError,
  ConfigValidationError,
  PluginDataError,
} from '../../src/config/loader.js';

const validConfig = {
  agents: [
    {
      id: 'claude-1',
      label: 'Claude',
      description: 'Claude AI assistant',
      adapterType: 'claude_local',
    },
  ],
};

describe('findConfigPath', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agent-plugin-cc-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds .claude/agents.json in the current directory', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir);
    writeFileSync(join(claudeDir, 'agents.json'), JSON.stringify(validConfig));

    const result = findConfigPath(tmpDir);
    expect(result).toBe(join(claudeDir, 'agents.json'));
  });

  it('walks up to find .claude/agents.json in parent directory', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir);
    writeFileSync(join(claudeDir, 'agents.json'), JSON.stringify(validConfig));

    const subDir = join(tmpDir, 'subdir', 'nested');
    mkdirSync(subDir, { recursive: true });

    const result = findConfigPath(subDir);
    expect(result).toBe(join(claudeDir, 'agents.json'));
  });

  it('throws ConfigNotFoundError when no config is found', () => {
    const emptyDir = join(tmpDir, 'empty');
    mkdirSync(emptyDir);

    // Use a path that won't find a config (isolated temp dir with no parents having .claude/agents.json)
    // We need to pick a path that truly has no .claude/agents.json up the tree
    // Use the tmp dir itself which won't have one
    expect(() => findConfigPath('/tmp/no-config-dir-xyz-does-not-exist')).toThrow(
      ConfigNotFoundError,
    );
  });
});

describe('loadConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'agent-plugin-cc-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns typed AgentsConfig from a valid file', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir);
    writeFileSync(join(claudeDir, 'agents.json'), JSON.stringify(validConfig));

    const config = loadConfig(tmpDir);
    expect(config.agents).toHaveLength(1);
    expect(config.agents[0]!.id).toBe('claude-1');
    expect(config.agents[0]!.adapterType).toBe('claude_local');
  });

  it('throws ConfigValidationError with field path for invalid config', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir);
    const invalidConfig = {
      agents: [
        {
          // missing required 'id'
          label: 'Claude',
          description: 'Test',
          adapterType: 'claude_local',
        },
      ],
    };
    writeFileSync(join(claudeDir, 'agents.json'), JSON.stringify(invalidConfig));

    expect(() => loadConfig(tmpDir)).toThrow(ConfigValidationError);
    try {
      loadConfig(tmpDir);
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigValidationError);
      const e = err as ConfigValidationError;
      expect(e.fieldPath).toContain('agents');
      expect(e.message).toContain('agents.json invalid at');
    }
  });

  it('throws ConfigValidationError for malformed JSON', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir);
    writeFileSync(join(claudeDir, 'agents.json'), '{ not valid json }');

    expect(() => loadConfig(tmpDir)).toThrow(ConfigValidationError);
  });
});

describe('validatePluginDataDir', () => {
  let originalEnv: string | undefined;
  let tmpDir: string;

  beforeEach(() => {
    originalEnv = process.env['CLAUDE_PLUGIN_DATA'];
    tmpDir = mkdtempSync(join(tmpdir(), 'agent-plugin-cc-test-'));
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env['CLAUDE_PLUGIN_DATA'] = originalEnv;
    } else {
      delete process.env['CLAUDE_PLUGIN_DATA'];
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns the directory path when env var is set and writable', () => {
    process.env['CLAUDE_PLUGIN_DATA'] = tmpDir;
    const result = validatePluginDataDir();
    expect(result).toBe(tmpDir);
  });

  it('throws PluginDataError when CLAUDE_PLUGIN_DATA is not set', () => {
    delete process.env['CLAUDE_PLUGIN_DATA'];
    expect(() => validatePluginDataDir()).toThrow(PluginDataError);
    expect(() => validatePluginDataDir()).toThrow('environment variable is not set');
  });
});
