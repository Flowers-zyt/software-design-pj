import { NumberValue } from '../../domain/NumberValue.js';
import type { Editor } from '../Editor.js';
import type { Command } from './Command.js';

export class ShowCommand implements Command {
  execute(editor: Editor, args: readonly string[]): readonly string[] {
    NumberValue.count(args, 1, 1, 'show <id>');
    const document = editor.document;
    const shape = document.find(args[0]!);
    const lines = [`${shape.label}  parent=${document.parentLabel(shape)}`];
    const geometry = Object.entries(shape.geometry()).map(([key, value]) => `${key}=${value}`).join(' ');
    if (geometry) lines.push(`  ${geometry}`);
    if (shape.text !== undefined) lines.push(`  text=${JSON.stringify(shape.text)}`);
    for (const [key, value] of Object.entries(shape.attributes())) {
      if (key !== 'id' && !Object.hasOwn(shape.geometry(), key)) lines.push(`  ${key}=${value}`);
    }
    if (shape.isContainer) lines.push(`  children=${shape.children.length}`);
    return lines;
  }
}
