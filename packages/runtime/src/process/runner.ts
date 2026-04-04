import { spawn } from 'node:child_process';
import type { ProcessResult } from '../types.js';

export class AdapterTimeoutError extends Error {
  public readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Adapter process timed out after ${timeoutMs}ms`);
    this.name = 'AdapterTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class AdapterProcessError extends Error {
  public readonly exitCode: number | null;
  public readonly stderr: string;
  constructor(exitCode: number | null, stderr: string) {
    super(`Adapter process exited with code ${exitCode}: ${stderr.slice(0, 500)}`);
    this.name = 'AdapterProcessError';
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export interface SpawnOptions {
  signal?: AbortSignal;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  timeoutMs?: number;
}

// Spawn a child process with optional AbortController timeout (per ADPT-09)
export function spawnWithTimeout(
  command: string,
  args: string[],
  opts: SpawnOptions = {},
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const ac = new AbortController();
    const timeoutMs = opts.timeoutMs ?? 60_000;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
    }, timeoutMs);

    const signal = opts.signal
      ? // Combine external signal with our timeout signal
        (() => {
          // If external signal already aborted, abort our controller too
          if (opts.signal!.aborted) ac.abort();
          opts.signal!.addEventListener('abort', () => ac.abort(), { once: true });
          return ac.signal;
        })()
      : ac.signal;

    const proc = spawn(command, args, {
      signal,
      env: opts.env ?? process.env,
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    proc.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        exitCode: code,
      });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      if ((err as NodeJS.ErrnoException).code === 'ABORT_ERR' || timedOut) {
        reject(new AdapterTimeoutError(timeoutMs));
      } else {
        reject(err);
      }
    });
  });
}
