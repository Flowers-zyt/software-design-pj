import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SvgXmlCodec } from '../src/infrastructure/SvgXmlCodec.js';
import { NodeFileStore } from '../src/infrastructure/NodeFileStore.js';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { MemoryFileStore } from './MemoryFileStore.js';

test('external SVG sample assigns IDs and keeps all seven elements', () => {
  const codec = new SvgXmlCodec();
  const result = codec.decode(readFileSync('examples/other.svg', 'utf8'));
  assert.deepEqual(result.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(result.document.all().length, 7);
  assert.equal(result.document.parentLabel(result.document.find('r2')), 'g#g1');
  assert.equal(codec.encode(codec.decode(codec.encode(result.document)).document), codec.encode(result.document));
});

test('ID assignment reserves explicit IDs throughout the file and is case sensitive', () => {
  const codec = new SvgXmlCodec();
  const { document, warnings } = codec.decode('<svg><rect/><g><rect id="rect1"/><circle/><circle id="circle1"/></g><rect id="Rect2"/></svg>');
  assert.deepEqual(warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id circle2 to unnamed <circle>',
  ]);
  assert.equal(document.has('Rect2'), true);
  assert.equal(document.has('rect2'), true);
  assert.throws(() => codec.decode('<svg><g id="a"><rect id="a"/></g></svg>'), /id already exists: a/);
});

test('all built-ins, text entities, empty text and inherited group styles round-trip', () => {
  const files = new MemoryFileStore();
  const codec = new SvgXmlCodec();
  const editor = new Editor(files, codec);
  const cli = new CommandDispatcher(editor);
  for (const line of [
    'init 300.5 200', 'create g scene', 'set scene fill #fff',
    'create rect r -1 2 3 4 in scene', 'create circle c 3 4 5 red in scene',
    'create ellipse e 6 7 8 9 blue in scene', 'create line l 1 2 3 4 black in scene',
    String.raw`create text t 1 2 "中文 & <hello> \"world\"" in scene`,
    'create text empty 0 0 ""', 'set l stroke-width 2.5', 'save round trip.svg',
  ]) {
    // The final unquoted path deliberately fails without destroying state.
    const result = cli.execute(line);
    if (!line.startsWith('save')) assert.ok(!result[0]?.startsWith('error:'), `${line}: ${result}`);
  }
  assert.match(cli.execute('save "round trip.svg"')[0]!, /^saved/);
  const output = files.read('round trip.svg');
  assert.match(output, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(output, /&amp; &lt;hello&gt;/);
  const expected = codec.encode(editor.document);
  cli.execute('read "round trip.svg"');
  assert.equal(codec.encode(editor.document), expected);
  assert.equal(editor.document.find('t').text, '中文 & <hello> "world"');
  assert.equal(editor.document.find('empty').text, '');
  assert.equal(Object.hasOwn(editor.document.find('r').attributes(), 'fill'), false);
  assert.equal(editor.document.find('scene').attributes().fill, '#fff');
  cli.execute('move r 1 1');
  assert.match(cli.execute('save')[0]!, /^saved to round trip.svg/);
});

test('malformed, unsupported and duplicate-ID reads retain document, save path and redo', () => {
  const codec = new SvgXmlCodec();
  const files = new MemoryFileStore();
  const editor = new Editor(files, codec);
  const cli = new CommandDispatcher(editor);
  cli.execute('init'); cli.execute('save old.svg');
  cli.execute('create rect r 0 0 1 1'); cli.execute('move r 3 4'); cli.execute('undo');
  const before = codec.encode(editor.document);
  const invalid = [
    '<svg><rect></svg>', '<html/>', '<svg><polygon id="p"/></svg>',
    '<svg><rect id="x"/><g id="x"/></svg>', '<svg><rect width="-1"/></svg>',
    '<svg><text><tspan>nested</tspan></text></svg>', '<svg><rect/>junk</svg>',
    '<!DOCTYPE svg><svg/>', '<svg xmlns="urn:other"/>',
    '<svg><g transform="rotate(30)"><rect/></g></svg>',
  ];
  for (const source of invalid) {
    files.write('bad.svg', source);
    const result = cli.execute('read bad.svg');
    assert.equal(result.length, 1);
    assert.match(result[0]!, /^error:/, source);
    assert.equal(codec.encode(editor.document), before, source);
  }
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.deepEqual(editor.document.find('r').geometry(), { x: '3', y: '4', width: '1', height: '1' });
  assert.match(cli.execute('save')[0]!, /^saved to old.svg/);
});

test('viewBox, root presentation attributes and prefixed SVG namespaces survive edits', () => {
  const codec = new SvgXmlCodec();
  const decoded = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="400px" height="300" viewBox="10 20 200 150" fill="red"><s:circle id="c" r="10"/></s:svg>');
  const cloned = decoded.document.clone();
  assert.equal(cloned.attributes().viewBox, '10 20 200 150');
  assert.equal(cloned.attributes().fill, 'red');
  assert.equal(codec.decode(codec.encode(cloned)).document.find('c').geometry().r, '10');
  cloned.resize('800', '600');
  assert.equal(cloned.attributes().viewBox, '0 0 800 600');
  const withoutDimensions = codec.decode('<svg viewBox="0 0 500 400"/>').document;
  assert.equal(withoutDimensions.width, '500');
  assert.equal(withoutDimensions.height, '400');
});

test('nested translate and uniform scale are normalized in SVG multiplication order', () => {
  const codec = new SvgXmlCodec();
  const document = codec.decode('<svg><g id="outer" transform="translate(60,40)"><g id="node" transform="translate(200,0) scale(0.8)"><rect id="r" x="0" y="0" width="120" height="60"/><text id="t" x="60" y="38" font-size="16">End</text></g></g></svg>').document;
  assert.deepEqual(document.find('r').geometry(), { x: '260', y: '40', width: '96', height: '48' });
  assert.equal(document.find('t').attributes()['font-size'], '12.8');
  assert.equal(document.find('outer').attributes().transform, undefined);
  document.find('node').move(10, 20);
  assert.equal(document.find('r').geometry().x, '270');
  assert.equal(codec.encode(codec.decode(codec.encode(document)).document), codec.encode(document));
  assert.throws(() => codec.decode('<svg><rect transform="scale(2,3)"/></svg>'), /unsupported SVG transform/);
});

test('file adapter writes UTF-8 atomically and translates IO errors without temp-file leaks', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-'));
  try {
    const files = new NodeFileStore();
    const path = join(directory, '中文 文件.svg');
    files.write(path, 'initial');
    files.write(path, '中文新内容');
    assert.equal(files.read(path), '中文新内容');
    assert.throws(() => files.read(join(directory, 'absent.svg')), /cannot read file:/);
    assert.throws(() => files.write(join(directory, 'missing', 'x.svg'), 'x'), /cannot write file:/);
    assert.throws(() => files.write(directory, 'x'), /cannot write file:/);
    assert.deepEqual(readdirSync(directory), ['中文 文件.svg']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('failed save keeps undo available and preserves existing target content', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-save-'));
  try {
    writeFileSync(join(directory, 'keep.txt'), 'keep');
    const editor = new Editor(new NodeFileStore(), new SvgXmlCodec());
    const cli = new CommandDispatcher(editor);
    cli.execute('init'); cli.execute('create g scene');
    assert.match(cli.execute(`save "${directory}"`)[0]!, /^error: cannot write file:/);
    assert.match(cli.execute('undo')[0]!, /^undone:/);
    assert.equal(editor.document.has('scene'), false);
    assert.equal(readFileSync(join(directory, 'keep.txt'), 'utf8'), 'keep');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
