import { describe, it, expect } from 'vitest';
import { spawnWithTimeout, AdapterTimeoutError } from '../../src/process/runner.js';

describe('spawnWithTimeout', () => {
  it('runs echo and returns stdout', async () => {
    const result = await spawnWithTimeout('echo', ['hello world']);
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.exitCode).toBe(0);
  });

  it('captures stderr output', async () => {
    // Use a shell command that writes to stderr
    const result = await spawnWithTimeout('sh', ['-c', 'echo error-output >&2']);
    expect(result.stderr.trim()).toBe('error-output');
    expect(result.exitCode).toBe(0);
  });

  it('returns non-zero exit code for failing commands', async () => {
    const result = await spawnWithTimeout('sh', ['-c', 'exit 42']);
    expect(result.exitCode).toBe(42);
  });

  it('throws AdapterTimeoutError when process exceeds timeout', async () => {
    await expect(
      spawnWithTimeout('sleep', ['10'], { timeoutMs: 100 }),
    ).rejects.toThrow(AdapterTimeoutError);
  });

  it('resolves when process completes within timeout', async () => {
    const result = await spawnWithTimeout('echo', ['fast'], { timeoutMs: 5000 });
    expect(result.stdout.trim()).toBe('fast');
    expect(result.exitCode).toBe(0);
  });
});
