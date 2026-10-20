import { NumberValue } from '../../domain/NumberValue.js';
import type { Editor } from '../Editor.js';
import type { Command } from './Command.js';

export class CanvasCommand implements Command {
  execute(editor: Editor, args: readonly string[]): readonly string[] {
    NumberValue.count(args, 0, 2, 'canvas [w h]');
    if (args.length === 1) throw new Error('usage: canvas [w h]');
    return editor.canvas(args[0], args[1]);
  }
}
