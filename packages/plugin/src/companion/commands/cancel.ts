import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  loadConfig,
  validatePluginDataDir,
  getStatePath,
  ConfigNotFoundError,
  ConfigValidationError,
} from '@agent-plugin-cc/runtime';
import { readJob, casUpdateJob, getCancelPath } from '../job.js';

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

  // Atomic cancel: only transition from pending/running (avoids TOCTOU with worker)
  const updated = casUpdateJob(statePath, jobId, ['pending', 'running'], {
    status: 'cancelled',
    endTime: new Date().toISOString(),
  });

  if (!updated) {
    // CMD-13: error if not in cancellable state
    console.log(
      JSON.stringify({
        error: `Cannot cancel job in '${job.status}' state. Only 'running' or 'pending' jobs can be cancelled.`,
      }),
    );
    process.exit(1);
  }

  // Write cancel sentinel so worker detects cancellation (JOB-06)
  const cancelPath = getCancelPath(statePath, jobId);
  mkdirSync(dirname(cancelPath), { recursive: true });
  writeFileSync(cancelPath, '', 'utf-8');

  console.log(JSON.stringify({ jobId, status: 'cancelled' }));
}
