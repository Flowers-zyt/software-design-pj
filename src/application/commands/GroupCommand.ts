import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 2, Infinity, 'group <newGid> <id1> <id2>...');
    const shape = document.group(args[0]!, args.slice(1));
    return `${shape.label} created with ${shape.children.length} children`;
  }
}
