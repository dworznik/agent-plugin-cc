import { execFile } from 'node:child_process';
import { join } from 'node:path';

const COMPANION_PATH = join(__dirname, '..', '..', 'scripts', 'agents-companion.cjs');

export interface CompanionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  json: Record<string, unknown> | null;
}

export function runCompanion(
  args: string[],
  opts?: { cwd?: string; env?: Record<string, string> },
): Promise<CompanionResult> {
  return new Promise((resolve) => {
    execFile(
      'node',
      [COMPANION_PATH, ...args],
      {
        cwd: opts?.cwd ?? process.cwd(),
        env: { ...process.env, ...opts?.env },
        timeout: 30_000,
      },
      (error, stdout, stderr) => {
        const rawCode = error?.code;
        const exitCode = typeof rawCode === 'number' ? rawCode : error ? 1 : 0;
        let json: Record<string, unknown> | null = null;
        try {
          json = JSON.parse(stdout.trim()) as Record<string, unknown>;
        } catch {
          /* not JSON */
        }
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode, json });
      },
    );
  });
}
