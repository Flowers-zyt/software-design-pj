import { NumberValue } from '../domain/NumberValue.js';
import type { Shape } from '../domain/Shape.js';

/** Import-only normalization of translation and positive uniform scaling. */
export class SvgTransform {
  constructor(private readonly factor = 1, private readonly dx = 0, private readonly dy = 0) {}

  static parse(source: string): SvgTransform {
    let result = new SvgTransform();
    let rest = source.trim();
    while (rest) {
      const match = /^(translate|scale)\s*\(([^)]*)\)\s*,?\s*/u.exec(rest);
      if (!match) throw new Error(`unsupported SVG transform: ${source}`);
      const values = match[2]!.trim().split(/[\s,]+/u).map(value => NumberValue.parse(value));
      if (values.length < 1 || values.length > 2) throw new Error(`unsupported SVG transform: ${source}`);
      const first = values[0]!;
      if (match[1] === 'translate') result = result.combine(new SvgTransform(1, first, values[1] ?? 0));
      else {
        if (first <= 0 || (values[1] !== undefined && values[1] !== first)) {
          throw new Error(`unsupported SVG transform: ${source}`);
        }
        result = result.combine(new SvgTransform(first));
      }
      rest = rest.slice(match[0].length);
    }
    return result;
  }

  combine(child: SvgTransform): SvgTransform {
    return new SvgTransform(NumberValue.finite(this.factor * child.factor),
      NumberValue.finite(this.dx + this.factor * child.dx), NumberValue.finite(this.dy + this.factor * child.dy));
  }

  apply(shape: Shape, inherited: Readonly<Record<string, string>>): void {
    shape.scale(this.factor);
    shape.move(this.dx, this.dy);
    if (this.factor !== 1) {
      const attrs: Record<string, string> = {};
      // XML transform scales paint and fonts too. CLI scale itself only scales geometry.
      for (const name of ['stroke-width', ...(shape.text === undefined ? [] : ['font-size'])]) {
        const raw = inherited[name] ?? (name === 'font-size' ? '16' : '1');
        attrs[name] = String(NumberValue.finite(NumberValue.nonnegative(raw.replace(/px$/u, ''), name) * this.factor));
      }
      shape.importAttributes(attrs);
    }
  }
}
