import { Shape } from './Shape.js';
import { NumberValue } from './NumberValue.js';

export class Group extends Shape {
  private readonly members: Shape[] = [];
  constructor(id: string) { super(id); }
  get type(): string { return 'g'; }
  override get children(): readonly Shape[] { return [...this.members]; }
  override get isContainer(): boolean { return true; }
  geometry(): Readonly<Record<string, string>> { return {}; }
  move(dx: number, dy: number): void { for (const child of this.members) child.move(dx, dy); }
  scale(factor: number): void { for (const child of this.members) child.scale(factor); }
  summary(): string { return this.withStyles(''); }
  protected setGeometry(): boolean { return false; }
  insert(shape: Shape, index = this.members.length): void { this.members.splice(index, 0, shape); }
  remove(shape: Shape): void {
    const index = this.members.indexOf(shape);
    if (index < 0) throw new Error(`shape is not a child: ${shape.id}`);
    this.members.splice(index, 1);
  }
  indexOf(shape: Shape): number { return this.members.indexOf(shape); }
  static create(id: string, params: readonly string[]): Group {
    NumberValue.count(params, 0, 0, 'create g <id> [in <containerId>]');
    return new Group(id);
  }
  static fromSvg(id: string): Group { return new Group(id); }
}
