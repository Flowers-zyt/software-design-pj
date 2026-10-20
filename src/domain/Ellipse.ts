import { Shape } from './Shape.js';
import { Point } from './Point.js';
import { NumberValue } from './NumberValue.js';

export class Ellipse extends Shape {
  private readonly center: Point;
  private radiusX: number;
  private radiusY: number;
  constructor(id: string, cx: string, cy: string, rx: string, ry: string) {
    super(id);
    this.center = new Point(cx, cy);
    this.radiusX = NumberValue.nonnegative(rx, 'rx');
    this.radiusY = NumberValue.nonnegative(ry, 'ry');
  }
  get type(): string { return 'ellipse'; }
  geometry(): Readonly<Record<string, string>> {
    return { cx: this.center.x, cy: this.center.y, rx: String(this.radiusX), ry: String(this.radiusY) };
  }
  move(dx: number, dy: number): void { this.center.move(dx, dy); }
  scale(factor: number): void {
    this.center.scale(factor);
    this.radiusX = NumberValue.finite(this.radiusX * factor);
    this.radiusY = NumberValue.finite(this.radiusY * factor);
  }
  summary(): string { return this.withStyles(`cx=${this.center.x} cy=${this.center.y} rx=${this.radiusX} ry=${this.radiusY}`); }
  override position(): string { return this.center.toString(); }
  protected setGeometry(attr: string, value: string): boolean {
    if (attr === 'cx') this.center.setX(value);
    else if (attr === 'cy') this.center.setY(value);
    else if (attr === 'rx') this.radiusX = NumberValue.nonnegative(value, attr);
    else if (attr === 'ry') this.radiusY = NumberValue.nonnegative(value, attr);
    else return false;
    return true;
  }
  static create(id: string, params: readonly string[]): Ellipse {
    NumberValue.count(params, 4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]');
    const result = new Ellipse(id, params[0]!, params[1]!, params[2]!, params[3]!);
    if (params[4] !== undefined) result.set('fill', params[4]);
    return result;
  }
  static fromSvg(id: string, attrs: Readonly<Record<string, string>>): Ellipse {
    return new Ellipse(id, attrs.cx ?? '0', attrs.cy ?? '0', attrs.rx ?? '0', attrs.ry ?? '0');
  }
}
