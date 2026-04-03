import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { LogEntry, HookSet } from '../types.js';

export interface Logger {
  info(message: string, durationMs?: number): void;
  warn(message: string): void;
  error(message: string): void;
}

// Create a logger that writes structured JSON log entries to a file (per LOG-01)
// and calls emitLog hook for each entry (per LOG-03).
// durationMs parameter on info() supports LOG-02 execution timing.
export function createLogger(
  jobId: string,
  logPath: string,
  emitLog: HookSet['emitLog'],
): Logger {
  mkdirSync(dirname(logPath), { recursive: true });

  function write(level: LogEntry['level'], message: string, durationMs?: number): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      jobId,
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
    };
    appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf-8');
    emitLog(entry);
  }

  return {
    info: (message: string, durationMs?: number) => write('info', message, durationMs),
    warn: (message: string) => write('warn', message),
    error: (message: string) => write('error', message),
  };
}
