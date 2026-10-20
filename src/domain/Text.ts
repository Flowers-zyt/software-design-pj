import { Shape } from './Shape.js';
import { Point } from './Point.js';
import { NumberValue } from './NumberValue.js';

export class Text extends Shape {
  private readonly origin: Point;
  private content: string;
  constructor(id: string, x: string, y: string, content: string) {
    super(id);
    this.origin = new Point(x, y);
    this.content = content;
  }
  get type(): string { return 'text'; }
  override get text(): string { return this.content; }
  geometry(): Readonly<Record<string, string>> { return { x: this.origin.x, y: this.origin.y }; }
  move(dx: number, dy: number): void { this.origin.move(dx, dy); }
  scale(factor: number): void { this.origin.scale(factor); }
  summary(): string { return this.withStyles(`${this.origin} ${JSON.stringify(this.content)}`); }
  override position(): string { return this.origin.toString(); }
  protected setGeometry(attr: string, value: string): boolean {
    if (attr === 'x') this.origin.setX(value);
    else if (attr === 'y') this.origin.setY(value);
    else if (attr === 'text') this.content = value;
    else return false;
    return true;
  }
  static create(id: string, params: readonly string[]): Text {
    NumberValue.count(params, 3, 3, 'create text <id> <x> <y> "content" [in <containerId>]');
    return new Text(id, params[0]!, params[1]!, params[2]!);
  }
  static fromSvg(id: string, attrs: Readonly<Record<string, string>>, text: string): Text {
    return new Text(id, attrs.x ?? '0', attrs.y ?? '0', text);
  }
}
