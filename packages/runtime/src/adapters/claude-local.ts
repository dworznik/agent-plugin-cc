import { AdapterProcessError } from '../process/runner.js';
import { parseJSON } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface ClaudeOutput {
  type: string;
  subtype: string;
  result: string;
  session_id?: string;
  cost_usd?: number;
  duration_ms?: number;
}

export class ClaudeLocalAdapter extends BaseAdapter {
  readonly binaryName = 'claude';
  readonly adapterType = 'claude_local';

  buildArgs(prompt: string, sessionId?: string): string[] {
    const args = ['-p', prompt, '--output-format', 'json'];
    if (sessionId) {
      args.push('--resume', sessionId);
    } else {
      args.push('--no-session-persistence');
    }
    return args;
  }

  parseOutput(stdout: string): AdapterResult {
    const parsed = parseJSON<ClaudeOutput>(stdout.trim());
    if (!parsed) {
      throw new AdapterProcessError(null, `claude_local: failed to parse JSON output: ${stdout.slice(0, 200)}`);
    }
    const { result, session_id, cost_usd, duration_ms, ...rest } = parsed;
    return {
      output: result,
      sessionId: session_id,
      metadata: { cost_usd, duration_ms, ...rest },
    };
  }

  encodeSession(result: AdapterResult): string | undefined {
    return result.sessionId;
  }

  decodeSession(raw: string): string {
    return raw;
  }
}
