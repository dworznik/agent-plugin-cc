import { AdapterProcessError } from '../process/runner.js';
import { parseJSONL } from '../process/parse.js';
import type { AdapterResult } from '../types.js';
import { BaseAdapter } from './base.js';

interface CodexMessageEvent {
  type: 'message';
  role: string;
  content: string;
}

interface CodexDoneEvent {
  type: 'done';
  session_id?: string;
}

type CodexEvent = CodexMessageEvent | CodexDoneEvent;

export class CodexLocalAdapter extends BaseAdapter {
  readonly binaryName = 'codex';
  readonly adapterType = 'codex_local';

  buildArgs(prompt: string, sessionId?: string): string[] {
    if (sessionId) {
      return ['exec', 'resume', sessionId, prompt, '--json'];
    }
    return ['exec', prompt, '--json', '--ephemeral'];
  }

  parseOutput(stdout: string): AdapterResult {
    const events = parseJSONL<CodexEvent>(stdout);
    if (events.length === 0) {
      throw new AdapterProcessError(null, `codex_local: no JSONL events in output: ${stdout.slice(0, 200)}`);
    }

    // Find last message event for output text
    const messageEvents = events.filter((e): e is CodexMessageEvent => e.type === 'message' && e.role === 'assistant');
    if (messageEvents.length === 0) {
      throw new AdapterProcessError(null, `codex_local: no assistant message events in output`);
    }
    const lastMessage = messageEvents[messageEvents.length - 1];

    // Find done event for session_id
    const doneEvent = events.find((e): e is CodexDoneEvent => e.type === 'done');
    const sessionId = doneEvent?.session_id;

    return {
      output: lastMessage.content,
      sessionId,
      metadata: { eventCount: events.length },
    };
  }

  encodeSession(result: AdapterResult): string | undefined {
    return result.sessionId;
  }

  decodeSession(raw: string): string {
    return raw;
  }
}
