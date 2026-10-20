import { NumberValue } from '../../domain/NumberValue.js';
import type { Editor } from '../Editor.js';
import { TreeFormatter } from '../TreeFormatter.js';
import type { Command } from './Command.js';

export class TreeCommand implements Command {
  execute(editor: Editor, args: readonly string[]): readonly string[] {
    NumberValue.count(args, 0, 1, 'tree [id]');
    return new TreeFormatter().format(editor.document, args[0]);
  }
}
