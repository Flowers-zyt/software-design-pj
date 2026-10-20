import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class BackCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 1, 1, 'back <id>');
    document.reorder(args[0]!, false);
    return `${document.find(args[0]!).label} sent to back`;
  }
}
