import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 1, 1, 'ungroup <gid>');
    document.ungroup(args[0]!);
    return `g#${args[0]} ungrouped`;
  }
}
