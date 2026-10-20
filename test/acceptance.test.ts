import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Editor } from '../src/application/Editor.js';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { SvgXmlCodec } from '../src/infrastructure/SvgXmlCodec.js';
import { MemoryFileStore } from './MemoryFileStore.js';

test('every successful edit can be undone and redone with exact document snapshots', () => {
  const codec = new SvgXmlCodec();
  const editor = new Editor(new MemoryFileStore(), codec);
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  const commands = [
    'create g outer', 'create g other', 'create rect a 10 20 30 40 red in outer',
    'create circle b 50 60 10 in outer', 'create ellipse e 10 20 30 40 blue in other',
    'create line edge 1 2 3 4 black in other', 'create text title 10 20 "A & B" in outer',
    'move outer .5 -2', 'scale outer 1.5', 'set title text "处理数据"', 'set outer stroke #123',
    'set b r 20', 'front a', 'back title', 'group pair b a',
    'set pair fill #fff', 'ungroup pair', 'addto other a',
    'group cross e title', 'move cross -5 8', 'delete cross', 'delete other',
  ];
  const snapshots = [codec.encode(editor.document)];
  for (const command of commands) {
    assert.ok(!cli.execute(command)[0]?.startsWith('error:'), command);
    snapshots.push(codec.encode(editor.document));
    // Every intermediate state must be a valid, lossless supported SVG.
    assert.equal(codec.encode(codec.decode(snapshots.at(-1)!).document), snapshots.at(-1));
  }
  for (let index = commands.length - 1; index >= 0; index--) {
    assert.match(cli.execute('undo')[0]!, /^undone:/);
    assert.equal(codec.encode(editor.document), snapshots[index], `undo ${commands[index]}`);
  }
  assert.deepEqual(cli.execute('undo'), ['error: nothing to undo']);
  for (let index = 1; index <= commands.length; index++) {
    assert.match(cli.execute('redo')[0]!, /^redone:/);
    assert.equal(codec.encode(editor.document), snapshots[index], `redo ${commands[index - 1]}`);
  }
  assert.deepEqual(cli.execute('redo'), ['error: nothing to redo']);
});

test('exact required errors leave the complete document and redo branch unchanged', () => {
  const codec = new SvgXmlCodec();
  const editor = new Editor(new MemoryFileStore(), codec);
  const cli = new CommandDispatcher(editor);
  for (const line of ['init', 'create g scene', 'create rect r1 0 0 10 10 in scene', 'move r1 1 1', 'undo']) cli.execute(line);
  const snapshot = codec.encode(editor.document);
  const cases = [
    ['create circle r1 1 2 3', 'id already exists: r1'],
    ['delete r9', 'no such shape: r9'],
    ['create g x in node9', 'no such container: node9'],
    ['create g x in r1', 'not a container: r1'],
    ['create hexagon x', 'unknown shape type: hexagon (is the plugin loaded?)'],
    ['create box x', 'unknown shape type: box (is the plugin loaded?)'],
    ['group x r1 scene', 'cannot group a container into its own descendant: scene'],
    ['ungroup scene', 'cannot ungroup top-level container: scene'],
    ['scale r1 -1', 'scale factor must be positive'],
    ['set r1 opacity 1', 'unknown attribute: opacity'],
    ['read absent.svg', 'cannot read file: absent.svg'],
  ];
  for (const [command, message] of cases) {
    assert.deepEqual(cli.execute(command!), [`error: ${message}`]);
    assert.equal(codec.encode(editor.document), snapshot, command);
  }
  assert.match(cli.execute('redo')[0]!, /^redone:/);
  assert.equal(editor.document.find('r1').geometry().x, '1');
});

test('all geometry attributes and common styles are editable only on appropriate types', () => {
  const editor = new Editor(new MemoryFileStore(), new SvgXmlCodec());
  const cli = new CommandDispatcher(editor);
  cli.execute('init');
  const samples: [string, string, readonly string[]][] = [
    ['rect', '1 2 3 4', ['x', 'y', 'width', 'height']],
    ['circle', '1 2 3', ['cx', 'cy', 'r']], ['ellipse', '1 2 3 4', ['cx', 'cy', 'rx', 'ry']],
    ['line', '1 2 3 4', ['x1', 'y1', 'x2', 'y2']], ['text', '1 2 "hello"', ['x', 'y']], ['g', '', []],
  ];
  for (const [type, params, keys] of samples) {
    cli.execute(`create ${type} ${type} ${params}`);
    for (const key of keys) {
      assert.match(cli.execute(`set ${type} ${key} 9.5`)[0]!, /updated:/);
      assert.equal(editor.document.find(type).geometry()[key], '9.5');
    }
    for (const [key, value] of [['fill', '#fff'], ['stroke', 'red'], ['stroke-width', '2.5']]) {
      assert.match(cli.execute(`set ${type} ${key} ${value}`)[0]!, /updated:/);
      assert.equal(editor.document.find(type).attributes()[key!], value);
    }
    assert.deepEqual(cli.execute(`set ${type} id changed`), ['error: unknown attribute: id']);
  }
  assert.match(cli.execute('set text text ""')[0]!, /updated:/);
  assert.equal(editor.document.find('text').text, '');
  assert.deepEqual(cli.execute('set rect text bad'), ['error: unknown attribute: text']);
});

test('bad arity and malformed input never mutate the document or consume history', () => {
  const codec = new SvgXmlCodec();
  const editor = new Editor(new MemoryFileStore(), codec);
  const cli = new CommandDispatcher(editor);
  cli.execute('init'); cli.execute('create g scene');
  const snapshot = codec.encode(editor.document);
  const bad = [
    'init 1 2 3', 'read', 'save a b', 'canvas 1', 'canvas 1 2 3', 'create',
    'create rect r 1 2 3', 'create circle c 1 2', 'create ellipse e 1 2 3',
    'create line l 1 2 3', 'create text t 1 2', 'create g x extra',
    'delete', 'move scene 1', 'scale scene', 'set scene fill', 'group pair',
    'ungroup', 'addto scene', 'front', 'back scene extra', 'tree a b',
    'show', 'help extra', 'undo extra', 'redo extra', 'set scene fill "broken', 'unknown',
  ];
  for (const line of bad) {
    const result = cli.execute(line);
    assert.equal(result.length, 1);
    assert.match(result[0]!, /^error:/, line);
    assert.equal(codec.encode(editor.document), snapshot, line);
  }
  assert.match(cli.execute('undo')[0]!, /^undone:/);
  assert.equal(editor.document.has('scene'), false);
});

test('real CLI replays the assignment transcript and remains usable after expected errors', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  try {
    const source = readFileSync('examples/session.cli', 'utf8')
      .replace('save examples/demo.svg', `save "${join(directory, 'demo.svg')}"`);
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], { input: source, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /circle#c1 moved to \(130,100\)/);
    assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>/);
    assert.match(result.stdout, /read examples\/other.svg \(7 elements\)/);
    assert.equal(result.stdout.split('\n').filter(line => line.startsWith('error:')).length, 2);
    assert.equal(new SvgXmlCodec().decode(readFileSync(join(directory, 'demo.svg'), 'utf8')).document.all().length, 5);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('real CLI creates the Unicode flowchart and exits cleanly on EOF', () => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-flow-'));
  try {
    const target = join(directory, '流程图.svg');
    const source = readFileSync('examples/flowchart.cli', 'utf8').replace('save examples/flowchart.svg', `save "${target}"`);
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/main.ts'], { input: source, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.ok(!result.stdout.includes('error:'), result.stdout);
    const document = new SvgXmlCodec().decode(readFileSync(target, 'utf8')).document;
    assert.equal(document.all().length, 8);
    assert.equal(document.find('process-label').text, '处理数据 v2');
    assert.equal(document.find('process').geometry().y, '100');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
