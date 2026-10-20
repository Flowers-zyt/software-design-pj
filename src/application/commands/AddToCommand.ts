import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 2, 2, 'addto <gid> <id>');
    document.addTo(args[0]!, args[1]!);
    return `${document.find(args[1]!).label} added to g#${args[0]}`;
  }
}
