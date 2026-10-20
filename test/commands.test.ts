import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { MemoryFileStore } from './MemoryFileStore.js';
import { HistoryTestCodec } from './HistoryTestCodec.js';

test('tokenizer preserves colors, quoted spaces, empty content, Unicode and Windows paths', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.parse('  # comment'), []);
  assert.deepEqual(tokenizer.parse('create rect r 0 0 1 1 #fff'), ['create', 'rect', 'r', '0', '0', '1', '1', '#fff']);
  assert.deepEqual(tokenizer.parse(String.raw`set title text "开始 and \"quotes\""`), ['set', 'title', 'text', '开始 and "quotes"']);
  assert.deepEqual(tokenizer.parse('set t text ""'), ['set', 't', 'text', '']);
  assert.deepEqual(tokenizer.parse('read "C:\\temp\\my file.svg"'), ['read', 'C:\\temp\\my file.svg']);
  assert.throws(() => tokenizer.parse('set t text "unfinished'), /unterminated/);
});

test('every edit is one history entry; display and failed commands preserve redo', () => {
  const editor = new Editor(new MemoryFileStore(), new HistoryTestCodec());
  const cli = new CommandDispatcher(editor);
  assert.deepEqual(cli.execute('create g x'), ["error: no document. use 'init' or 'read' first"]);
  assert.ok(cli.execute('help').length > 10);
  cli.execute('init');
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  cli.execute('create rect r 10 20 100 50 red');
  cli.execute('create circle c 50 60 10');
  cli.execute('group pair c r');
  assert.deepEqual(editor.document.children.map(shape => shape.id), ['pair']);
  cli.execute('undo');
  assert.deepEqual(editor.document.children.map(shape => shape.id), ['r', 'c']);
  assert.deepEqual(cli.execute('move r NaN 0'), ['error: invalid number: NaN']);
  cli.execute('tree'); cli.execute('show r'); cli.execute('help'); cli.execute('canvas');
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.deepEqual(editor.document.find('pair').children.map(shape => shape.id), ['r', 'c']);
  cli.execute('undo');
  cli.execute('move r 5 -2');
  assert.deepEqual(cli.execute('redo'), ['error: nothing to redo']);
  assert.equal(editor.document.find('r').geometry().x, '15');
  cli.execute('undo');
  assert.equal(editor.document.find('r').geometry().x, '10');
});

test('failed recursive mutation is atomic, including when overflow occurs after earlier descendants', () => {
  const editor = new Editor(new MemoryFileStore(), new HistoryTestCodec());
  const cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g g', 'create circle a 1 1 1 in g', 'create circle b 1e308 0 1 in g']) cli.execute(line);
  const before = new HistoryTestCodec().encode(editor.document);
  assert.deepEqual(cli.execute('scale g 2'), ['error: number must be finite']);
  assert.equal(new HistoryTestCodec().encode(editor.document), before);
  cli.execute('undo');
  assert.equal(editor.document.has('b'), false);
  cli.execute('redo');
  assert.equal(editor.document.has('b'), true);
});

test('IO barrier is applied only on success and edits release it', () => {
  const editor = new Editor(new MemoryFileStore(), new HistoryTestCodec());
  const cli = new CommandDispatcher(editor);
  cli.execute('init'); cli.execute('create g scene');
  assert.deepEqual(cli.execute('save'), ['error: no file path. use save <file.svg>']);
  assert.match(cli.execute('undo')[0]!, /^undone:/);
  cli.execute('redo'); cli.execute('save memory.svg');
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  assert.deepEqual(cli.execute('redo'), ['error: undo not allowed after io command']);
  cli.execute('create g nested in scene'); cli.execute('undo');
  assert.equal(editor.document.has('nested'), false);
  cli.execute('redo'); cli.execute('canvas 400 300');
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  cli.execute('create g x');
  assert.deepEqual(cli.execute('init -1 100'), ['error: canvas width must be positive']);
  assert.deepEqual(cli.execute('read absent.svg'), ['error: cannot read file: absent.svg']);
  cli.execute('undo');
  assert.equal(editor.document.has('x'), false);
});

test('create in, cycle errors, subtree deletion and z-order have reversible structural effects', () => {
  const editor = new Editor(new MemoryFileStore(), new HistoryTestCodec());
  const cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g scene', 'create g node in scene', 'create rect a 0 0 2 3 in node', 'create text t 1 2 "你好" in node']) {
    assert.ok(!cli.execute(line)[0]?.startsWith('error:'), line);
  }
  assert.deepEqual(cli.execute('create g x in absent'), ['error: no such container: absent']);
  assert.deepEqual(cli.execute('create g x in a'), ['error: not a container: a']);
  assert.deepEqual(cli.execute('group bad a scene'), ['error: cannot group a container into its own descendant: scene']);
  assert.deepEqual(cli.execute('ungroup scene'), ['error: cannot ungroup top-level container: scene']);
  assert.deepEqual(cli.execute('scale a 0'), ['error: scale factor must be positive']);
  cli.execute('front a');
  assert.deepEqual(editor.document.find('node').children.map(shape => shape.id), ['t', 'a']);
  cli.execute('back a');
  assert.deepEqual(editor.document.find('node').children.map(shape => shape.id), ['a', 't']);
  cli.execute('ungroup node');
  assert.deepEqual(editor.document.find('scene').children.map(shape => shape.id), ['a', 't']);
  cli.execute('undo'); cli.execute('delete node');
  assert.equal(editor.document.has('a'), false);
  cli.execute('undo');
  assert.equal(editor.document.find('a').geometry().width, '2');
  assert.equal(editor.document.parentLabel(editor.document.find('a')), 'g#node');
});
