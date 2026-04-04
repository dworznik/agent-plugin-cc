#!/usr/bin/env node
import { setupCommand } from './commands/setup.js';
import { listCommand } from './commands/list.js';
import { taskCommand } from './commands/task.js';
import { statusCommand } from './commands/status.js';
import { resultCommand } from './commands/result.js';
import { cancelCommand } from './commands/cancel.js';

const [, , subcommand, ...rest] = process.argv;

const commands: Record<string, (args: string[]) => Promise<void>> = {
  setup: setupCommand,
  list: listCommand,
  task: taskCommand,
  status: statusCommand,
  result: resultCommand,
  cancel: cancelCommand,
};

const handler = commands[subcommand ?? ''];
if (!handler) {
  console.log(
    JSON.stringify({
      error: `Unknown command: ${subcommand ?? '(none)'}. Available: ${Object.keys(commands).join(', ')}`,
    }),
  );
  process.exit(1);
}

handler(rest).catch((err: unknown) => {
  console.log(JSON.stringify({ error: (err as Error).message ?? String(err) }));
  process.exit(1);
});
