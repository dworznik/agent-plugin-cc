import { spawnWithTimeout, AdapterTimeoutError, AdapterProcessError } from '../process/runner.js';
import type { AdapterResult, ExecuteOptions, ProcessResult } from '../types.js';
import type { Logger } from '../logging/logger.js';

export abstract class BaseAdapter {
  abstract readonly binaryName: string;
  abstract readonly adapterType: string;

  // Build CLI args for non-interactive execution (per-adapter)
  abstract buildArgs(prompt: string, sessionId?: string): string[];

  // Parse CLI stdout into AdapterResult (per-adapter)
  abstract parseOutput(stdout: string): AdapterResult;

  // Encode session data for storage (returns session identifier string)
  abstract encodeSession(result: AdapterResult): string | undefined;

  // Decode stored session string into session ID for resume
  abstract decodeSession(raw: string): string;

  // Template method: execute with timeout, error handling, execution timing logging (per D-02, ERR-03, ADPT-09, LOG-02)
  // logger parameter is optional -- when provided, logs adapter start/completion/failure with durationMs.
  async execute(prompt: string, opts: ExecuteOptions = {}, logger?: Logger): Promise<AdapterResult> {
    const args = this.buildArgs(prompt, opts.sessionId);
    const timeoutMs = opts.timeoutMs ?? 60_000;

    logger?.info(`Adapter ${this.adapterType} execution started`);
    const startTime = Date.now();

    let result: ProcessResult;
    try {
      result = await spawnWithTimeout(this.binaryName, args, {
        timeoutMs,
        env: opts.env ? { ...process.env, ...opts.env } : undefined,
        cwd: opts.cwd,
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      // AdapterTimeoutError passes through (per ADPT-09)
      if (err instanceof AdapterTimeoutError) {
        logger?.error(`Adapter ${this.adapterType} timed out after ${durationMs}ms`);
        throw err;
      }
      // Other spawn errors wrapped (per ERR-03)
      logger?.error(`Adapter ${this.adapterType} failed after ${durationMs}ms: ${err instanceof Error ? err.message : String(err)}`);
      throw new AdapterProcessError(null, err instanceof Error ? err.message : String(err));
    }

    if (result.exitCode !== 0) {
      const durationMs = Date.now() - startTime;
      logger?.error(`Adapter ${this.adapterType} exited with code ${result.exitCode} after ${durationMs}ms`);
      throw new AdapterProcessError(result.exitCode, result.stderr);
    }

    const durationMs = Date.now() - startTime;
    logger?.info(`Adapter ${this.adapterType} execution completed`, durationMs);
    return this.parseOutput(result.stdout);
  }
}
