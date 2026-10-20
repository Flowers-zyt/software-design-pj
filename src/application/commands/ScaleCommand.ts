import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 2, 2, 'scale <id> <factor>');
    const factor = NumberValue.positive(args[1]!, 'scale factor');
    const shape = document.find(args[0]!);
    shape.scale(factor);
    return `${shape.label} scaled by ${factor}`;
  }
}
