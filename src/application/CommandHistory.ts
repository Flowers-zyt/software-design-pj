import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './commands/EditCommand.js';
import { HistoryEntry } from './HistoryEntry.js';

export class CommandHistory {
  private readonly past: HistoryEntry[] = [];
  private readonly future: HistoryEntry[] = [];
  private blocked = true;

  execute(command: EditCommand, document: SvgDocument, args: readonly string[]): { document: SvgDocument; message: string } {
    const working = document.clone();
    const message = command.apply(working, args);
    // Build both snapshots before committing anything, including history state.
    const entry = new HistoryEntry(document, working, message);
    this.past.push(entry);
    this.future.length = 0;
    this.blocked = false;
    return { document: working, message };
  }
  barrier(): void { this.past.length = 0; this.future.length = 0; this.blocked = true; }
  undo(): { document: SvgDocument; message: string } {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const entry = this.past.at(-1);
    if (!entry) throw new Error('nothing to undo');
    const document = entry.undo();
    this.past.pop();
    this.future.push(entry);
    return { document, message: `undone: ${entry.summary}` };
  }
  redo(): { document: SvgDocument; message: string } {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const entry = this.future.at(-1);
    if (!entry) throw new Error('nothing to redo');
    const document = entry.redo();
    this.future.pop();
    this.past.push(entry);
    return { document, message: `redone: ${entry.summary}` };
  }
}
