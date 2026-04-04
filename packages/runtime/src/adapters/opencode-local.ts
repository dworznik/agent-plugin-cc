import { AdapterProcessError } from '../process/runner.js';
import { parseJSON } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface OpencodeOutput {
  message?: string;
  content?: string;
  text?: string;
  result?: string;
  session_id?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export class OpencodeLocalAdapter extends BaseAdapter {
  readonly binaryName = 'opencode';
  readonly adapterType = 'opencode_local';

  buildArgs(prompt: string, sessionId?: string): string[] {
    const args = ['run', prompt, '--format', 'json'];
    if (sessionId) {
      args.push('--session', sessionId);
    }
    return args;
  }

  parseOutput(stdout: string): AdapterResult {
    const parsed = parseJSON<OpencodeOutput>(stdout.trim());
    if (!parsed) {
      throw new AdapterProcessError(null, `opencode_local: failed to parse JSON output: ${stdout.slice(0, 200)}`);
    }
    const output = parsed.message ?? parsed.content ?? parsed.text ?? parsed.result ?? '';
    const sessionId = parsed.session_id ?? parsed.sessionId;
    const { message, content, text, result, session_id, sessionId: sId, ...rest } = parsed;
    return {
      output: String(output),
      sessionId: sessionId !== undefined ? String(sessionId) : undefined,
      metadata: rest,
    };
  }

  encodeSession(result: AdapterResult): string | undefined {
    return result.sessionId;
  }

  decodeSession(raw: string): string {
    return raw;
  }
}
