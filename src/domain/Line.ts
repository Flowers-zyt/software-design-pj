import { Shape } from './Shape.js';
import { Point } from './Point.js';
import { NumberValue } from './NumberValue.js';

export class Line extends Shape {
  private readonly start: Point;
  private readonly end: Point;
  constructor(id: string, x1: string, y1: string, x2: string, y2: string) {
    super(id);
    this.start = new Point(x1, y1);
    this.end = new Point(x2, y2);
  }
  get type(): string { return 'line'; }
  geometry(): Readonly<Record<string, string>> {
    return { x1: this.start.x, y1: this.start.y, x2: this.end.x, y2: this.end.y };
  }
  move(dx: number, dy: number): void { this.start.move(dx, dy); this.end.move(dx, dy); }
  scale(factor: number): void { this.start.scale(factor); this.end.scale(factor); }
  summary(): string { return this.withStyles(`${this.start} -> ${this.end}`); }
  override position(): string { return `${this.start} -> ${this.end}`; }
  protected setGeometry(attr: string, value: string): boolean {
    if (attr === 'x1') this.start.setX(value);
    else if (attr === 'y1') this.start.setY(value);
    else if (attr === 'x2') this.end.setX(value);
    else if (attr === 'y2') this.end.setY(value);
    else return false;
    return true;
  }
  static create(id: string, params: readonly string[]): Line {
    NumberValue.count(params, 4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]');
    const result = new Line(id, params[0]!, params[1]!, params[2]!, params[3]!);
    if (params[4] !== undefined) result.set('stroke', params[4]);
    return result;
  }
  static fromSvg(id: string, attrs: Readonly<Record<string, string>>): Line {
    return new Line(id, attrs.x1 ?? '0', attrs.y1 ?? '0', attrs.x2 ?? '0', attrs.y2 ?? '0');
  }
}
