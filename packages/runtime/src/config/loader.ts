import { existsSync, readFileSync, accessSync, constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { AgentsConfigSchema } from './schema.js';
import type { AgentsConfig } from '../types.js';

export class ConfigNotFoundError extends Error {
  constructor(startDir: string) {
    super(
      `agents.json not found: walked up from ${startDir} to filesystem root without finding .claude/agents.json`,
    );
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigValidationError extends Error {
  public readonly fieldPath: string;
  constructor(fieldPath: string, message: string) {
    super(`agents.json invalid at '${fieldPath}': ${message}`);
    this.name = 'ConfigValidationError';
    this.fieldPath = fieldPath;
  }
}

export class PluginDataError extends Error {
  constructor(reason: string) {
    super(`CLAUDE_PLUGIN_DATA ${reason}`);
    this.name = 'PluginDataError';
  }
}

// Walk up from startDir to find .claude/agents.json (per CONF-04, D-06)
export function findConfigPath(startDir: string): string {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, '.claude', 'agents.json');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new ConfigNotFoundError(startDir);
    dir = parent;
  }
}

// Load and validate agents.json (per CONF-02). Returns typed config.
export function loadConfig(cwd: string): AgentsConfig {
  const configPath = findConfigPath(cwd);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    throw new ConfigValidationError('(root)', 'File is not valid JSON');
  }
  const result = AgentsConfigSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.errors[0];
    const fieldPath = issue.path.join('.') || '(root)';
    throw new ConfigValidationError(fieldPath, issue.message);
  }
  return result.data;
}

// Validate CLAUDE_PLUGIN_DATA env var is set and writable (per ERR-05)
export function validatePluginDataDir(): string {
  const dir = process.env['CLAUDE_PLUGIN_DATA'];
  if (!dir) {
    throw new PluginDataError(
      'environment variable is not set. Claude Code must set CLAUDE_PLUGIN_DATA before invoking the companion.',
    );
  }
  try {
    accessSync(dir, constants.W_OK);
  } catch {
    throw new PluginDataError(`directory is not writable: ${dir}`);
  }
  return dir;
}
