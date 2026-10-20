import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('polymorphic move and scale include both line endpoints and every geometric dimension', () => {
  const factory = new ShapeFactory();
  const samples: [string, string[], Record<string, string>][] = [
    ['rect', ['1', '2', '3', '4'], { x: '6', y: '10', width: '6', height: '8' }],
    ['circle', ['1', '2', '3'], { cx: '6', cy: '10', r: '6' }],
    ['ellipse', ['1', '2', '3', '4'], { cx: '6', cy: '10', rx: '6', ry: '8' }],
    ['line', ['1', '2', '3', '4'], { x1: '6', y1: '10', x2: '10', y2: '14' }],
    ['text', ['1', '2', '你好'], { x: '6', y: '10' }],
  ];
  for (const [type, params, expected] of samples) {
    const shape = factory.create(type, type, params);
    shape.move(2, 3);
    shape.scale(2);
    assert.deepEqual(shape.geometry(), expected, type);
  }
});

test('nested composite operations and deep clones preserve independent ownership', () => {
  const doc = new SvgDocument();
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'outer', []));
  doc.add(factory.create('g', 'inner', []), 'outer');
  doc.add(factory.create('circle', 'c', ['10', '20', '5']), 'inner');
  const copy = doc.clone();
  copy.find('outer').move(5, -10);
  copy.find('outer').scale(2);
  assert.deepEqual(copy.find('c').geometry(), { cx: '30', cy: '20', r: '10' });
  assert.deepEqual(doc.find('c').geometry(), { cx: '10', cy: '20', r: '5' });
  assert.throws(() => doc.group('bad', ['c', 'outer']), /own descendant: outer/);
  assert.throws(() => doc.addTo('inner', 'outer'), /own descendant/);
  assert.equal(doc.has('bad'), false);
});

test('group preserves tree order and nested ungroup restores position', () => {
  const doc = new SvgDocument();
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'scene', []));
  for (const id of ['a', 'b', 'c']) doc.add(factory.create('rect', id, ['0', '0', '1', '1']), 'scene');
  doc.group('pair', ['c', 'a']);
  assert.deepEqual(doc.find('pair').children.map(shape => shape.id), ['a', 'c']);
  assert.deepEqual(doc.find('scene').children.map(shape => shape.id), ['pair', 'b']);
  doc.ungroup('pair');
  assert.deepEqual(doc.find('scene').children.map(shape => shape.id), ['a', 'c', 'b']);
  assert.throws(() => doc.ungroup('scene'), /cannot ungroup top-level container: scene/);
});

test('whitelists, numeric validation, case sensitive IDs and defaults', () => {
  const factory = new ShapeFactory();
  const doc = new SvgDocument();
  const shape = factory.create('rect', 'r', ['.5', '-2', '0', '3e1']);
  assert.equal(Object.hasOwn(shape.attributes(), 'fill'), false);
  for (const value of ['NaN', 'Infinity', '0x10', '', '12px']) assert.throws(() => shape.set('x', value));
  assert.throws(() => shape.set('width', '-1'), /non-negative/);
  assert.throws(() => shape.set('r', '3'), /unknown attribute: r/);
  assert.throws(() => shape.set('id', 'new'), /unknown attribute: id/);
  assert.throws(() => factory.create('box', 'box', []), /unknown shape type: box/);
  doc.add(shape);
  doc.add(factory.create('g', 'R', []));
  assert.throws(() => doc.add(factory.create('g', 'r', [])), /id already exists: r/);
  assert.equal(doc.all().length, 2);
});
