import { NumberValue } from '../../domain/NumberValue.js';
import type { Editor } from '../Editor.js';
import type { Command } from './Command.js';

export class UndoCommand implements Command {
  execute(editor: Editor, args: readonly string[]): readonly string[] {
    NumberValue.count(args, 0, 0, 'undo');
    return editor.undo();
  }
}
