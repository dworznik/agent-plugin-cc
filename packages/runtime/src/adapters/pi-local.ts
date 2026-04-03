import { AdapterProcessError } from '../process/runner.js';
import { parseJSON } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface PiOutput {
  result?: string;
  text?: string;
  message?: string;
  response?: string;
  session?: string;
  session_id?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export class PiLocalAdapter extends BaseAdapter {
  readonly binaryName = 'pi';
  readonly adapterType = 'pi_local';

  buildArgs(prompt: string, sessionId?: string): string[] {
    const args = ['--mode', 'json', prompt];
    if (sessionId) {
      // Pi's --session flag expects a session path or ID (not a bare UUID)
      // Per RESEARCH.md: session is stored as ~/.pi/agent/sessions/<path>
      args.push('--session', sessionId);
    }
    return args;
  }

  parseOutput(stdout: string): AdapterResult {
    const parsed = parseJSON<PiOutput>(stdout.trim());
    if (!parsed) {
      throw new AdapterProcessError(null, `pi_local: failed to parse JSON output: ${stdout.slice(0, 200)}`);
    }
    const output = parsed.result ?? parsed.text ?? parsed.message ?? parsed.response ?? '';
    const sessionId = parsed.session ?? parsed.session_id ?? parsed.sessionId;
    const { result, text, message, response, session, session_id, sessionId: sId, ...rest } = parsed;
    return {
      output: String(output),
      sessionId: sessionId !== undefined ? String(sessionId) : undefined,
      metadata: rest,
    };
  }

  // encodeSession stores session file path or ID as returned by Pi
  encodeSession(result: AdapterResult): string | undefined {
    return result.sessionId;
  }

  // decodeSession returns raw session path or ID (may be a file path from ~/.pi/agent/sessions/)
  decodeSession(raw: string): string {
    return raw;
  }
}
