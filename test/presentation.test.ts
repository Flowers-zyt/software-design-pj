import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { Repl } from '../src/cli/Repl.js';
import { SvgXmlCodec } from '../src/infrastructure/SvgXmlCodec.js';
import { MemoryFileStore } from './MemoryFileStore.js';

test('tree prints Unicode connectors, every geometry type and subtree-only output', () => {
  const cli = new CommandDispatcher(new Editor(new MemoryFileStore(), new SvgXmlCodec()));
  for (const line of ['init', 'create g scene', 'create rect r 1 2 3 4 red in scene', 'create g nested in scene',
    'create ellipse e 1 2 3 4 in nested', 'create line l 1 2 3 4 black', 'create text t 5 6 "Hello world"']) cli.execute(line);
  assert.deepEqual(cli.execute('tree'), [
    'svg (800x600)', '├── g#scene', '│   ├── rect#r x=1 y=2 w=3 h=4 fill=red',
    '│   └── g#nested', '│       └── ellipse#e cx=1 cy=2 rx=3 ry=4',
    '├── line#l (1,2) -> (3,4) stroke=black', '└── text#t (5,6) "Hello world"',
  ]);
  assert.deepEqual(cli.execute('tree nested'), ['g#nested', '└── ellipse#e cx=1 cy=2 rx=3 ry=4']);
  assert.deepEqual(cli.execute('tree r'), ['rect#r x=1 y=2 w=3 h=4 fill=red']);
  assert.deepEqual(cli.execute('show r'), ['rect#r  parent=g#scene', '  x=1 y=2 width=3 height=4', '  fill=red']);
  assert.deepEqual(cli.execute('show t'), ['text#t  parent=svg', '  x=5 y=6', '  text="Hello world"']);
});

test('ungroup materializes inherited paint while keeping explicit child overrides and sibling position', () => {
  const editor = new Editor(new MemoryFileStore(), new SvgXmlCodec());
  const cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g scene', 'create g pair in scene', 'set pair fill red', 'set pair stroke black',
    'create circle a 1 2 3 in pair', 'create circle b 4 5 6 blue in pair', 'create text after 0 0 "x" in scene']) cli.execute(line);
  cli.execute('ungroup pair');
  assert.equal(editor.document.find('a').attributes().fill, 'red');
  assert.equal(editor.document.find('b').attributes().fill, 'blue');
  assert.equal(editor.document.find('b').attributes().stroke, 'black');
  assert.deepEqual(editor.document.find('scene').children.map(shape => shape.id), ['a', 'b', 'after']);
  cli.execute('undo');
  assert.equal(Object.hasOwn(editor.document.find('a').attributes(), 'fill'), false);
  assert.equal(editor.document.parentLabel(editor.document.find('a')), 'g#pair');
});

test('interactive REPL displays the specified prompt and startup help and accepts commands', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let transcript = '';
  output.on('data', chunk => { transcript += String(chunk); });
  const editor = new Editor(new MemoryFileStore(), new SvgXmlCodec());
  const running = new Repl(new CommandDispatcher(editor)).run(input, output, true);
  input.end('init 320 240\ncreate g scene\ntree\n');
  await running;
  assert.match(transcript, /svg-editor 0\.1/);
  assert.match(transcript, /svg> /);
  assert.match(transcript, /canvas 320x240 created/);
  assert.equal(editor.document.has('scene'), true);
});
