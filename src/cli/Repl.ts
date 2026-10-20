import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from './CommandDispatcher.js';

export class Repl {
  constructor(private readonly dispatcher: CommandDispatcher) {}
  async run(input: Readable, output: Writable, interactive: boolean): Promise<void> {
    const lines = createInterface({ input, output, terminal: interactive });
    if (interactive) {
      output.write("svg-editor 0.1 — type 'help' for commands\n\n");
      lines.setPrompt('svg> ');
      lines.prompt();
    }
    for await (const line of lines) {
      for (const message of this.dispatcher.execute(line)) output.write(`${message}\n`);
      if (interactive) lines.prompt();
    }
  }
}
