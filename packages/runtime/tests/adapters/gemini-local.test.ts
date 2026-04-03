import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GeminiLocalAdapter } from '../../src/adapters/gemini-local.js';
import { AdapterTimeoutError, AdapterProcessError } from '../../src/process/runner.js';
import { useShimPath } from '../helpers/path-override.js';

describe('GeminiLocalAdapter', () => {
  useShimPath();
  const adapter = new GeminiLocalAdapter();
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
    expect(result.output).toBe('Hello from gemini');
    expect(result.sessionId).toBe('gemini-session-101');
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
