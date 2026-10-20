import { Shape } from './Shape.js';
import { Point } from './Point.js';
import { NumberValue } from './NumberValue.js';

export class Circle extends Shape {
  private readonly center: Point;
  private radius: number;
  constructor(id: string, cx: string, cy: string, r: string) {
    super(id);
    this.center = new Point(cx, cy);
    this.radius = NumberValue.nonnegative(r, 'r');
  }
  get type(): string { return 'circle'; }
  geometry(): Readonly<Record<string, string>> { return { cx: this.center.x, cy: this.center.y, r: String(this.radius) }; }
  move(dx: number, dy: number): void { this.center.move(dx, dy); }
  scale(factor: number): void { this.center.scale(factor); this.radius = NumberValue.finite(this.radius * factor); }
  summary(): string { return this.withStyles(`cx=${this.center.x} cy=${this.center.y} r=${this.radius}`); }
  override position(): string { return this.center.toString(); }
  protected setGeometry(attr: string, value: string): boolean {
    if (attr === 'cx') this.center.setX(value);
    else if (attr === 'cy') this.center.setY(value);
    else if (attr === 'r') this.radius = NumberValue.nonnegative(value, attr);
    else return false;
    return true;
  }
  static create(id: string, params: readonly string[]): Circle {
    NumberValue.count(params, 3, 4, 'create circle <id> <cx> <cy> <r> [fill] [in <containerId>]');
    const result = new Circle(id, params[0]!, params[1]!, params[2]!);
    if (params[3] !== undefined) result.set('fill', params[3]);
    return result;
  }
  static fromSvg(id: string, attrs: Readonly<Record<string, string>>): Circle {
    return new Circle(id, attrs.cx ?? '0', attrs.cy ?? '0', attrs.r ?? '0');
  }
}
