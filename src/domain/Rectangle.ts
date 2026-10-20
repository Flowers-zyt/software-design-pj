import { Shape } from './Shape.js';
import { Point } from './Point.js';
import { NumberValue } from './NumberValue.js';

export class Rectangle extends Shape {
  private readonly origin: Point;
  private width: number;
  private height: number;

  constructor(id: string, x: string, y: string, width: string, height: string) {
    super(id);
    this.origin = new Point(x, y);
    this.width = NumberValue.nonnegative(width, 'width');
    this.height = NumberValue.nonnegative(height, 'height');
  }

  get type(): string { return 'rect'; }
  geometry(): Readonly<Record<string, string>> {
    return { x: this.origin.x, y: this.origin.y, width: String(this.width), height: String(this.height) };
  }
  move(dx: number, dy: number): void { this.origin.move(dx, dy); }
  scale(factor: number): void {
    this.origin.scale(factor);
    this.width = NumberValue.finite(this.width * factor);
    this.height = NumberValue.finite(this.height * factor);
  }
  summary(): string { return this.withStyles(`x=${this.origin.x} y=${this.origin.y} w=${this.width} h=${this.height}`); }
  override position(): string { return this.origin.toString(); }
  protected setGeometry(attr: string, value: string): boolean {
    if (attr === 'x') this.origin.setX(value);
    else if (attr === 'y') this.origin.setY(value);
    else if (attr === 'width') this.width = NumberValue.nonnegative(value, attr);
    else if (attr === 'height') this.height = NumberValue.nonnegative(value, attr);
    else return false;
    return true;
  }
  static create(id: string, params: readonly string[]): Rectangle {
    NumberValue.count(params, 4, 5, 'create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]');
    const result = new Rectangle(id, params[0]!, params[1]!, params[2]!, params[3]!);
    if (params[4] !== undefined) result.set('fill', params[4]);
    return result;
  }
  static fromSvg(id: string, attrs: Readonly<Record<string, string>>): Rectangle {
    return new Rectangle(id, attrs.x ?? '0', attrs.y ?? '0', attrs.width ?? '0', attrs.height ?? '0');
  }
}
