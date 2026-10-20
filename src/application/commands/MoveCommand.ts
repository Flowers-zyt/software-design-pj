import { NumberValue } from '../../domain/NumberValue.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 3, 3, 'move <id> <dx> <dy>');
    const shape = document.find(args[0]!);
    const dx = NumberValue.parse(args[1]!);
    const dy = NumberValue.parse(args[2]!);
    shape.move(dx, dy);
    return shape.isContainer ? `${shape.label} moved by (${dx},${dy})` : `${shape.label} moved to ${shape.position()}`;
  }
}
