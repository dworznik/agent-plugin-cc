import { AdapterProcessError } from '../process/runner.js';
import { parseJSON } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface CursorOutput {
  result?: string;
  text?: string;
  message?: string;
  chat_id?: string;
  chatId?: string;
  [key: string]: unknown;
}

export class CursorAdapter extends BaseAdapter {
  readonly binaryName = 'cursor';
  readonly adapterType = 'cursor';

  buildArgs(prompt: string, sessionId?: string): string[] {
    const args = ['agent', '--print', prompt, '--output-format', 'json', '--trust'];
    if (sessionId) {
      args.push('--resume', sessionId);
    }
    return args;
  }

  parseOutput(stdout: string): AdapterResult {
    const parsed = parseJSON<CursorOutput>(stdout.trim());
    if (!parsed) {
      throw new AdapterProcessError(null, `cursor: failed to parse JSON output: ${stdout.slice(0, 200)}`);
    }
    const output = parsed.result ?? parsed.text ?? parsed.message;
    if (output === undefined) {
      throw new AdapterProcessError(null, `cursor: response missing result/text/message fields: ${JSON.stringify(parsed).slice(0, 200)}`);
    }
    const sessionId = parsed.chat_id ?? parsed.chatId;
    const { result, text, message, chat_id, chatId, ...rest } = parsed;
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
