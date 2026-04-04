import { AdapterProcessError } from '../process/runner.js';
import { parseJSON } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface GeminiOutput {
  response?: string;
  text?: string;
  result?: string;
  session_id?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export class GeminiLocalAdapter extends BaseAdapter {
  readonly binaryName = 'gemini';
  readonly adapterType = 'gemini_local';

  buildArgs(prompt: string, sessionId?: string): string[] {
    const args = [prompt, '-o', 'json'];
    if (sessionId) {
      args.push('--resume', sessionId);
    }
    return args;
  }

  parseOutput(stdout: string): AdapterResult {
    const parsed = parseJSON<GeminiOutput>(stdout.trim());
    if (!parsed) {
      throw new AdapterProcessError(null, `gemini_local: failed to parse JSON output: ${stdout.slice(0, 200)}`);
    }
    const output = parsed.response ?? parsed.text ?? parsed.result ?? '';
    const sessionId = parsed.session_id ?? parsed.sessionId;
    const { response, text, result, session_id, sessionId: sId, ...rest } = parsed;
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
