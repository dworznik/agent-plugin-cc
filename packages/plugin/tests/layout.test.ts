import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_ROOT = join(__dirname, '..');

function fileExists(relPath: string): boolean {
  return existsSync(join(PLUGIN_ROOT, relPath));
}

function readJson(relPath: string): unknown {
  const content = readFileSync(join(PLUGIN_ROOT, relPath), 'utf-8');
  return JSON.parse(content);
}

function readFile(relPath: string): string {
  return readFileSync(join(PLUGIN_ROOT, relPath), 'utf-8');
}

function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      result[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return result;
}

describe('Plugin layout conformance', () => {

  // LAYOUT-01: marketplace.json with valid plugin metadata
  describe('LAYOUT-01: marketplace.json', () => {
    it('exists at .claude-plugin/marketplace.json', () => {
      expect(fileExists('.claude-plugin/marketplace.json')).toBe(true);
    });

    it('has required fields: name, owner, metadata, plugins[]', () => {
      const m = readJson('.claude-plugin/marketplace.json') as Record<string, unknown>;
      expect(m.name).toBeDefined();
      expect(m.name).toBeTypeOf('string');
      expect(m.owner).toBeDefined();
      expect(m.owner).toBeTypeOf('object');
      expect(m.metadata).toBeDefined();
      expect(m.metadata).toBeTypeOf('object');
      expect(Array.isArray(m.plugins)).toBe(true);
      expect((m.plugins as unknown[]).length).toBeGreaterThan(0);
    });

    it('plugins[0] has name, description, version, author, source', () => {
      const m = readJson('.claude-plugin/marketplace.json') as { plugins: Record<string, unknown>[] };
      const plugin = m.plugins[0];
      expect(plugin.name).toBeDefined();
      expect(plugin.description).toBeDefined();
      expect(plugin.version).toBeDefined();
      expect(plugin.author).toBeDefined();
      expect(plugin.source).toBeDefined();
    });
  });

  // LAYOUT-02: plugin.json declaring commands and agents
  describe('LAYOUT-02: plugin.json', () => {
    it('exists at .claude-plugin/plugin.json', () => {
      expect(fileExists('.claude-plugin/plugin.json')).toBe(true);
    });

    it('has required fields: name, version, description, commands, agents', () => {
      const p = readJson('.claude-plugin/plugin.json') as Record<string, unknown>;
      expect(p.name).toBeDefined();
      expect(p.name).toBeTypeOf('string');
      expect(p.version).toBeDefined();
      expect(p.description).toBeDefined();
      expect(p.commands).toBeDefined();
      expect(p.agents).toBeDefined();
    });

    it('commands path points to ./commands/', () => {
      const p = readJson('.claude-plugin/plugin.json') as { commands: string };
      expect(p.commands).toBe('./commands/');
    });

    it('agents path points to ./agents/', () => {
      const p = readJson('.claude-plugin/plugin.json') as { agents: string };
      expect(p.agents).toBe('./agents/');
    });
  });

  // LAYOUT-03: commands/ directory with one file per command
  describe('LAYOUT-03: command files', () => {
    const commands = ['setup', 'list', 'task', 'status', 'result', 'cancel'];

    it.each(commands)('commands/%s.md exists', (cmd) => {
      expect(fileExists(`commands/${cmd}.md`)).toBe(true);
    });

    it.each(commands)('commands/%s.md has YAML frontmatter with description', (cmd) => {
      const content = readFile(`commands/${cmd}.md`);
      expect(content.startsWith('---')).toBe(true);
      const fm = extractFrontmatter(content);
      expect(fm.description).toBeDefined();
      expect(fm.description.length).toBeGreaterThan(0);
    });

    it.each(commands)('commands/%s.md references agents-companion.cjs', (cmd) => {
      const content = readFile(`commands/${cmd}.md`);
      expect(content).toContain('agents-companion.cjs');
    });
  });

  // LAYOUT-04: agents/ directory with delegation subagent
  describe('LAYOUT-04: delegation agent', () => {
    it('agents/delegation.md exists', () => {
      expect(fileExists('agents/delegation.md')).toBe(true);
    });

    it('has YAML frontmatter with name and description', () => {
      const content = readFile('agents/delegation.md');
      expect(content.startsWith('---')).toBe(true);
      const fm = extractFrontmatter(content);
      expect(fm.name).toBeDefined();
      expect(fm.description).toBeDefined();
    });
  });

  // LAYOUT-05: scripts/ directory with companion script
  describe('LAYOUT-05: companion script', () => {
    it('scripts/agents-companion.cjs exists', () => {
      expect(fileExists('scripts/agents-companion.cjs')).toBe(true);
    });

    it('companion script is non-empty', () => {
      const content = readFile('scripts/agents-companion.cjs');
      expect(content.length).toBeGreaterThan(10);
    });
  });

  // LAYOUT-06: structural conformance summary
  describe('LAYOUT-06: full structural check', () => {
    const requiredFiles = [
      '.claude-plugin/marketplace.json',
      '.claude-plugin/plugin.json',
      'commands/setup.md',
      'commands/list.md',
      'commands/task.md',
      'commands/status.md',
      'commands/result.md',
      'commands/cancel.md',
      'agents/delegation.md',
      'scripts/agents-companion.cjs',
    ];

    it.each(requiredFiles)('%s exists', (file) => {
      expect(fileExists(file)).toBe(true);
    });
  });
});
