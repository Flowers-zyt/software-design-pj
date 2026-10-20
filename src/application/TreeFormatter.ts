import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class TreeFormatter {
  format(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.find(id);
      const lines = [shape.summary()];
      this.append(shape.children, '', lines);
      return lines;
    }
    const lines = [`svg (${document.width}x${document.height})`];
    this.append(document.children, '', lines);
    return lines;
  }
  private append(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((shape, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${shape.summary()}`);
      this.append(shape.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
