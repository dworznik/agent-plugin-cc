import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig,
  validatePluginDataDir,
  getStatePath,
  ConfigNotFoundError,
  ConfigValidationError,
} from '@agent-plugin-cc/runtime';
import { readJob, updateJob, getCancelPath } from '../job.js';

export async function cancelCommand(args: string[]): Promise<void> {
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
    console.log(JSON.stringify({ error: 'Usage: cancel <job-id>' }));
    process.exit(1);
  }

  const pluginDataDir = validatePluginDataDir();
  const statePath = getStatePath(pluginDataDir, process.cwd());
  const job = readJob(statePath, jobId);

  if (!job) {
    console.log(JSON.stringify({ error: `Job not found: ${jobId}` }));
    process.exit(1);
  }

  if (job.status !== 'running' && job.status !== 'pending') {
    // CMD-13: error if not in cancellable state
    console.log(
      JSON.stringify({
        error: `Cannot cancel job in '${job.status}' state. Only 'running' or 'pending' jobs can be cancelled.`,
      }),
    );
    process.exit(1);
  }

  // Write cancel sentinel (JOB-06)
  const cancelPath = getCancelPath(statePath, jobId);
  mkdirSync(dirname(cancelPath), { recursive: true });
  writeFileSync(cancelPath, '', 'utf-8');

  // Update job metadata to cancelled
  updateJob(statePath, jobId, { status: 'cancelled', endTime: new Date().toISOString() });

  console.log(JSON.stringify({ jobId, status: 'cancelled' }));
}
