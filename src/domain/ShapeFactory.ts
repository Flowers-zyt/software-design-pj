import { Shape } from './Shape.js';
import { Rectangle } from './Rectangle.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';

interface ShapeConstructor {
  create(id: string, params: readonly string[]): Shape;
  fromSvg(id: string, attributes: Readonly<Record<string, string>>, text: string): Shape;
}

/** The only shape-name dispatch point; explicit built-ins for Phase 1. */
export class ShapeFactory {
  private readonly types = new Map<string, ShapeConstructor>([
    ['rect', Rectangle], ['circle', Circle], ['ellipse', Ellipse],
    ['line', Line], ['text', Text], ['g', Group],
  ]);
  private resolve(type: string): ShapeConstructor {
    const constructor = this.types.get(type);
    if (!constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return constructor;
  }
  create(type: string, id: string, params: readonly string[]): Shape { return this.resolve(type).create(id, params); }
  fromSvg(type: string, id: string, attributes: Readonly<Record<string, string>>, text = ''): Shape {
    const result = this.resolve(type).fromSvg(id, attributes, text);
    result.importAttributes(attributes);
    return result;
  }
  copy(shape: Shape): Shape {
    const result = this.fromSvg(shape.type, shape.id, shape.attributes(), shape.text);
    if (result instanceof Group) for (const child of shape.children) result.insert(this.copy(child));
    return result;
  }
}
