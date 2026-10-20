import { DOMImplementation, DOMParser, XMLSerializer, type Document, type Element, type Node } from '@xmldom/xmldom';
import type { SvgCodec } from '../application/ports/SvgCodec.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { Shape } from '../domain/Shape.js';
import { NumberValue } from '../domain/NumberValue.js';
import { SvgTransform } from './SvgTransform.js';

export class SvgXmlCodec implements SvgCodec {
  private static readonly namespace = 'http://www.w3.org/2000/svg';
  private readonly factory = new ShapeFactory();

  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    let xml: Document;
    try {
      xml = new DOMParser({ onError: (_level, message) => { throw new Error(message); } }).parseFromString(source, 'text/xml');
    } catch (error) {
      throw new Error(`invalid SVG: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (xml.doctype) throw new Error('invalid SVG: DOCTYPE is not supported');
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new Error('invalid SVG: root element must be <svg>');
    this.checkNamespace(root);
    const attributes = this.attributes(root);
    const viewBox = attributes.viewBox?.trim().split(/[\s,]+/u);
    if (viewBox) {
      if (viewBox.length !== 4) throw new Error('invalid SVG: viewBox requires four numbers');
      viewBox.forEach(value => NumberValue.parse(value, 'viewBox'));
      NumberValue.positive(viewBox[2]!, 'viewBox width');
      NumberValue.positive(viewBox[3]!, 'viewBox height');
    }
    const width = (attributes.width ?? viewBox?.[2] ?? '800').replace(/px$/u, '');
    const height = (attributes.height ?? viewBox?.[3] ?? '600').replace(/px$/u, '');
    // Reserve ALL explicit IDs before filling holes, including IDs later in the file.
    const reserved = new Set<string>();
    for (const element of this.descendants(root)) {
      const id = element.getAttribute('id');
      if (id) {
        if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
        reserved.add(id);
      }
    }
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const transform = SvgTransform.parse(attributes.transform ?? '');
    // Root transform has been flattened into imported geometry.
    const normalizedAttributes = { ...attributes };
    delete normalizedAttributes.transform;
    const normalized = new SvgDocument(width, height, normalizedAttributes);
    for (const element of this.elements(root)) {
      this.readShape(element, normalized, undefined, reserved, counters, warnings, transform, attributes);
    }
    return { document: normalized, warnings };
  }

  private checkNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== SvgXmlCodec.namespace) {
      throw new Error(`invalid SVG namespace: ${element.namespaceURI}`);
    }
  }
  private attributes(element: Element): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      result[attribute.name] = attribute.value;
    }
    return result;
  }
  private elements(parent: Node): readonly Element[] {
    const result: Element[] = [];
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === child.ELEMENT_NODE) result.push(child as Element);
      else if ((child.nodeType === child.TEXT_NODE || child.nodeType === child.CDATA_SECTION_NODE) && child.nodeValue?.trim()) {
        throw new Error('invalid SVG: unexpected text outside <text>');
      }
    }
    return result;
  }
  private descendants(parent: Node): readonly Element[] {
    const result: Element[] = [];
    // Use DOM traversal here; text contents are valid while collecting IDs.
    for (let child = parent.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === child.ELEMENT_NODE) { result.push(child as Element); result.push(...this.descendants(child)); }
    }
    return result;
  }

  private readShape(element: Element, document: SvgDocument, parent: string | undefined,
    reserved: Set<string>, counters: Map<string, number>, warnings: string[], inheritedTransform: SvgTransform,
    inheritedAttributes: Readonly<Record<string, string>>): void {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    const attrs = this.attributes(element);
    let id = attrs.id;
    if (!id) {
      let sequence = counters.get(type) ?? 0;
      do { id = `${type}${++sequence}`; } while (reserved.has(id));
      counters.set(type, sequence);
      reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.fromSvg(type, id, attrs, element.textContent ?? '');
    const transform = inheritedTransform.combine(SvgTransform.parse(attrs.transform ?? ''));
    const effective = { ...inheritedAttributes, ...attrs };
    if (!shape.isContainer) {
      if (this.descendants(element).length) throw new Error(`unsupported nested element in <${type}>`);
      if (shape.text === undefined && element.textContent?.trim()) throw new Error(`unexpected text in <${type}>`);
      transform.apply(shape, effective);
    }
    document.add(shape, parent);
    if (shape.isContainer) {
      for (const child of this.elements(element)) this.readShape(child, document, id, reserved, counters, warnings, transform, effective);
    }
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(SvgXmlCodec.namespace, 'svg', null);
    const root = xml.documentElement!;
    for (const [name, value] of Object.entries(document.attributes())) root.setAttribute(name, value);
    for (const shape of document.children) {
      root.appendChild(xml.createTextNode('\n  '));
      root.appendChild(this.writeShape(xml, shape, 1));
    }
    root.appendChild(xml.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }
  private writeShape(xml: Document, shape: Shape, depth: number): Element {
    const element = xml.createElementNS(SvgXmlCodec.namespace, shape.type);
    for (const [name, value] of Object.entries(shape.attributes())) element.setAttribute(name, value);
    if (shape.text !== undefined) element.appendChild(xml.createTextNode(shape.text));
    for (const child of shape.children) {
      element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth + 1)}`));
      element.appendChild(this.writeShape(xml, child, depth + 1));
    }
    if (shape.children.length) element.appendChild(xml.createTextNode(`\n${'  '.repeat(depth)}`));
    return element;
  }
}
