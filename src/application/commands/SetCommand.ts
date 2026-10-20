import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class SetCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 3, 3, 'set <id> <attr> <value>');
    const shape = document.find(args[0]!);
    shape.set(args[1]!, args[2]!);
    return `${shape.label} updated: ${args[1]}=${JSON.stringify(args[2])}`;
  }
}
