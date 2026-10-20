import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { Editor } from '../Editor.js';
import type { Command } from './Command.js';

export abstract class EditCommand implements Command {
  execute(editor: Editor, args: readonly string[]): readonly string[] {
    return editor.edit(this, args);
  }
  abstract apply(document: SvgDocument, args: readonly string[]): string;
}
