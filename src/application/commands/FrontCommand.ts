import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class FrontCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 1, 1, 'front <id>');
    document.reorder(args[0]!, true);
    return `${document.find(args[0]!).label} brought to front`;
  }
}
