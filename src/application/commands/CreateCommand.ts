import { NumberValue } from '../../domain/NumberValue.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  apply(document: SvgDocument, args: readonly string[]): string {
    NumberValue.count(args, 2, Infinity, 'create <type> <id> [params...] [in <containerId>]');
    const params = args.slice(2);
    let parent: string | undefined;
    if (params.length >= 2 && params.at(-2) === 'in') {
      parent = params.pop()!;
      params.pop();
    }
    document.ensureAvailable(args[1]!);
    const shape = new ShapeFactory().create(args[0]!, args[1]!, params);
    document.add(shape, parent);
    return `${shape.label} created${parent === undefined ? '' : ` in g#${parent}`}`;
  }
}
