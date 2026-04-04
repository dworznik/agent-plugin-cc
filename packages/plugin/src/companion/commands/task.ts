import { fork } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  loadConfig,
  validatePluginDataDir,
  getStatePath,
  getLogPath,
  ConfigNotFoundError,
  ConfigValidationError,
  deleteSession,
  defaultHooks,
  createLogger,
  ClaudeLocalAdapter,
  CodexLocalAdapter,
  CursorAdapter,
  GeminiLocalAdapter,
  OpencodeLocalAdapter,
  PiLocalAdapter,
} from '@agent-plugin-cc/runtime';
import type { AgentConfig, BaseAdapter } from '@agent-plugin-cc/runtime';
import { writeJob } from '../job.js';

function createAdapter(agent: AgentConfig): BaseAdapter {
  switch (agent.adapterType) {
    case 'claude_local':   return new ClaudeLocalAdapter();
    case 'codex_local':    return new CodexLocalAdapter();
    case 'cursor':         return new CursorAdapter();
    case 'gemini_local':   return new GeminiLocalAdapter();
    case 'opencode_local': return new OpencodeLocalAdapter();
    case 'pi_local':       return new PiLocalAdapter();
    default: {
      // TypeScript exhaustiveness check
      const _: never = agent.adapterType;
      throw new Error(`Unknown adapter type: ${String(_)}`);
    }
  }
}

export async function taskCommand(args: string[]): Promise<void> {
  // Config guard (D-03, ERR-01, ERR-02)
  let config;
  try {
    config = loadConfig(process.cwd());
  } catch (err) {
    if (err instanceof ConfigNotFoundError) {
      console.log(JSON.stringify({ error: 'No agents.json found. Run /agents:setup to configure agents.' }));
      process.exit(1);
    }
    if (err instanceof ConfigValidationError) {
      console.log(JSON.stringify({ error: err.message }));
      process.exit(1);
    }
    throw err;
  }

  // Parse argv: --agent <id>, --background, --fresh, --resume, rest = prompt
  let agentId: string | null = null;
  let background = false;
  let fresh = false;
  let resume = false;
  const promptParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--agent') {
      agentId = args[++i] ?? null;
    } else if (arg === '--background') {
      background = true;
    } else if (arg === '--fresh') {
      fresh = true;
    } else if (arg === '--resume') {
      resume = true;
    } else {
      promptParts.push(arg);
    }
  }

  if (!agentId) {
    console.log(JSON.stringify({ error: 'Missing required flag: --agent <id>' }));
    process.exit(1);
  }

  const prompt = promptParts.join(' ');

  // Agent lookup (CMD-05)
  const agent = config.agents.find(a => a.id === agentId);
  if (!agent) {
    const available = config.agents.map(a => a.id).join(', ');
    console.log(JSON.stringify({ error: `Agent not found: ${agentId}. Available: ${available}` }));
    process.exit(1);
  }

  const cwd = process.cwd();
  const pluginDataDir = validatePluginDataDir();
  const statePath = getStatePath(pluginDataDir, cwd);

  if (background) {
    // Background dispatch (CMD-04, JOB-07, D-04, D-05)
    const jobId = randomUUID();

    // Write metadata BEFORE forking (Pitfall 2)
    writeJob(statePath, {
      jobId,
      agentId: agent.id,
      status: 'pending',
      startTime: new Date().toISOString(),
      pid: null,
    });

    // Fork detached worker
    const worker = fork(
      join(__dirname, 'agents-worker.cjs'),
      [jobId, agent.id, prompt, JSON.stringify(agent)],
      {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env as Record<string, string>, CLAUDE_PLUGIN_DATA: pluginDataDir },
      },
    );
    worker.unref();

    console.log(JSON.stringify({ jobId, status: 'pending' }));
    return;
  }

  // Foreground execution (CMD-03)

  // Session handling (CMD-06, CMD-07)
  if (fresh) {
    deleteSession(pluginDataDir, cwd, agent.id);
  }

  let sessionId: string | undefined;
  if (resume) {
    const existing = defaultHooks.loadSession(cwd, agent.id);
    if (existing) {
      sessionId = existing.sessionId;
    }
  }

  const jobId = randomUUID();
  const logPath = getLogPath(pluginDataDir, cwd, jobId);
  const logger = createLogger(jobId, logPath, defaultHooks.emitLog);

  const adapter = createAdapter(agent);
  let result;
  try {
    result = await adapter.execute(prompt, {
      sessionId,
      cwd,
      env: defaultHooks.buildAgentEnv(agent.id, process.env as Record<string, string>),
    });
  } catch (err) {
    logger.error((err as Error).message ?? String(err));
    console.log(JSON.stringify({ error: (err as Error).message ?? String(err) }));
    process.exit(1);
  }

  // Persist session if adapter returned a sessionId
  if (result.sessionId) {
    defaultHooks.saveSession(cwd, agent.id, {
      agentId: agent.id,
      adapterType: agent.adapterType,
      sessionId: result.sessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  console.log(JSON.stringify({ output: result.output, sessionId: result.sessionId ?? null }));
}
