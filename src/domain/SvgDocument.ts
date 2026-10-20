import { Group } from './Group.js';
import { Shape } from './Shape.js';
import { ShapeFactory } from './ShapeFactory.js';
import { NumberValue } from './NumberValue.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly root = new Group('__internal_root__');
  constructor(width = '800', height = '600') {
    this.widthValue = NumberValue.positive(width, 'canvas width');
    this.heightValue = NumberValue.positive(height, 'canvas height');
  }
  get width(): string { return String(this.widthValue); }
  get height(): string { return String(this.heightValue); }
  get children(): readonly Shape[] { return this.root.children; }
  resize(width: string, height: string): void {
    const w = NumberValue.positive(width, 'canvas width');
    const h = NumberValue.positive(height, 'canvas height');
    this.widthValue = w;
    this.heightValue = h;
  }
  all(): readonly Shape[] {
    const result: Shape[] = [];
    this.collect(this.children, result);
    return result;
  }
  private collect(shapes: readonly Shape[], result: Shape[]): void {
    for (const shape of shapes) { result.push(shape); this.collect(shape.children, result); }
  }
  find(id: string): Shape {
    const shape = this.all().find(candidate => candidate.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  has(id: string): boolean { return this.all().some(shape => shape.id === id); }
  ensureAvailable(id: string): void { if (this.has(id)) throw new Error(`id already exists: ${id}`); }
  container(id: string): Group {
    if (!this.has(id)) throw new Error(`no such container: ${id}`);
    const shape = this.find(id);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }
  parent(shape: Shape): Group {
    const parent = [this.root, ...this.all()].find(candidate => candidate.children.includes(shape));
    if (!(parent instanceof Group)) throw new Error(`shape is detached: ${shape.id}`);
    return parent;
  }
  parentLabel(shape: Shape): string {
    const parent = this.parent(shape);
    return parent === this.root ? 'svg' : parent.label;
  }
  add(shape: Shape, parentId?: string): void {
    const incoming: Shape[] = [shape];
    this.collect(shape.children, incoming);
    const seen = new Set<string>();
    for (const item of incoming) {
      this.ensureAvailable(item.id);
      if (seen.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      seen.add(item.id);
    }
    (parentId === undefined ? this.root : this.container(parentId)).insert(shape);
  }
  delete(id: string): Shape {
    const shape = this.find(id);
    this.parent(shape).remove(shape);
    return shape;
  }
  private contains(ancestor: Shape, target: Shape): boolean {
    return ancestor.children.some(child => child === target || this.contains(child, target));
  }
  group(id: string, ids: readonly string[]): Group {
    this.ensureAvailable(id);
    if (new Set(ids).size !== ids.length) throw new Error('duplicate group member');
    const selected = ids.map(member => this.find(member));
    for (const shape of selected) {
      if (selected.some(other => other !== shape && this.contains(shape, other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const group = new Group(id);
    // Preserve document traversal order, even when CLI ids are supplied in reverse order.
    const ordered = this.all().filter(shape => selected.includes(shape));
    const first = ordered[0];
    if (!first) throw new Error('group requires at least one shape');
    const parents = ordered.map(shape => this.parent(shape));
    const sameParent = parents.every(parent => parent === parents[0]);
    const target = sameParent ? parents[0]! : this.root;
    const index = sameParent ? target.indexOf(first) : this.rootBranchIndex(first);
    for (const shape of ordered) { this.parent(shape).remove(shape); group.insert(shape); }
    target.insert(group, index);
    return group;
  }
  private rootBranchIndex(shape: Shape): number {
    let branch = shape;
    while (this.parent(branch) !== this.root) branch = this.parent(branch);
    return this.root.indexOf(branch);
  }
  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parent(group);
    if (parent === this.root) throw new Error(`cannot ungroup top-level container: ${id}`);
    const index = parent.indexOf(group);
    // Preserve inherited paint/presentation properties when removing the group.
    const inherited = Object.entries(group.attributes()).filter(([key]) => key !== 'id' && !key.startsWith('data-'));
    for (const child of group.children) {
      const attrs = { ...Object.fromEntries(inherited), ...child.attributes() };
      child.importAttributes(attrs);
    }
    parent.remove(group);
    for (const [offset, child] of group.children.entries()) { group.remove(child); parent.insert(child, index + offset); }
  }
  addTo(gid: string, id: string): void {
    const target = this.container(gid);
    const shape = this.find(id);
    if (shape === target || this.contains(shape, target)) {
      throw new Error(`cannot group a container into its own descendant: ${id}`);
    }
    this.parent(shape).remove(shape);
    target.insert(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.find(id);
    const parent = this.parent(shape);
    parent.remove(shape);
    parent.insert(shape, front ? parent.children.length : 0);
  }
  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height);
    const factory = new ShapeFactory();
    for (const child of this.children) copy.root.insert(factory.copy(child));
    return copy;
  }
}
