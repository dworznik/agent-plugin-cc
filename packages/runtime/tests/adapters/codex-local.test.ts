import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CodexLocalAdapter } from '../../src/adapters/codex-local.js';
import { AdapterTimeoutError, AdapterProcessError } from '../../src/process/runner.js';
import { useShimPath } from '../helpers/path-override.js';

describe('CodexLocalAdapter', () => {
  useShimPath();
  const adapter = new CodexLocalAdapter();
  let origTestMode: string | undefined;

  beforeEach(() => {
    origTestMode = process.env['__ADAPTER_TEST_MODE'];
  });
  afterEach(() => {
    if (origTestMode === undefined) delete process.env['__ADAPTER_TEST_MODE'];
    else process.env['__ADAPTER_TEST_MODE'] = origTestMode;
  });

  it('parses successful output correctly', async () => {
    process.env['__ADAPTER_TEST_MODE'] = 'success';
    const result = await adapter.execute('test prompt');
    expect(result.output).toBe('Hello from codex');
    expect(result.sessionId).toBe('codex-session-456');
  });

  it('throws AdapterProcessError on non-zero exit', async () => {
    process.env['__ADAPTER_TEST_MODE'] = 'error';
    await expect(adapter.execute('test prompt')).rejects.toThrow(AdapterProcessError);
  });

  it('throws AdapterTimeoutError on timeout', async () => {
    process.env['__ADAPTER_TEST_MODE'] = 'timeout';
    await expect(adapter.execute('test prompt', { timeoutMs: 200 })).rejects.toThrow(AdapterTimeoutError);
  });
});
