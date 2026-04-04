import { readFileSync, existsSync } from 'node:fs';
import {
  loadConfig,
  validatePluginDataDir,
  getStatePath,
  ConfigNotFoundError,
  ConfigValidationError,
} from '@agent-plugin-cc/runtime';
import { readJob, getResultPath } from '../job.js';

export async function resultCommand(args: string[]): Promise<void> {
  // Config guard (ERR-01, ERR-02)
  try {
    loadConfig(process.cwd());
  } catch (err) {
    if (err instanceof ConfigNotFoundError) {
      console.log(JSON.stringify({ error: 'No agents.json found. Run /agents:setup to configure agents.' }));
      process.exit(1);
    }
    if (err instanceof ConfigValidationError) {
      console.log(JSON.stringify({ error: (err as ConfigValidationError).message }));
      process.exit(1);
    }
    throw err;
  }

  const jobId = args[0];
  if (!jobId) {
    console.log(JSON.stringify({ error: 'Usage: result <job-id>' }));
    process.exit(1);
  }

  const pluginDataDir = validatePluginDataDir();
  const statePath = getStatePath(pluginDataDir, process.cwd());
  const job = readJob(statePath, jobId);

  if (!job) {
    console.log(JSON.stringify({ error: `Job not found: ${jobId}` }));
    process.exit(1);
  }

  if (job.status !== 'completed') {
    // CMD-11: error if not completed
    if (job.status === 'failed') {
      console.log(JSON.stringify({ error: `Job failed: ${job.error ?? 'unknown error'}` }));
    } else {
      console.log(JSON.stringify({ error: `Job not completed. Current status: ${job.status}` }));
    }
    process.exit(1);
  }

  const resultPath = getResultPath(statePath, jobId);
  if (!existsSync(resultPath)) {
    console.log(JSON.stringify({ error: `Result file missing for job: ${jobId}` }));
    process.exit(1);
  }

  const output = readFileSync(resultPath, 'utf-8');
  console.log(JSON.stringify({ jobId, output }));
}
