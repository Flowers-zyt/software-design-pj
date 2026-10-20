import { Editor } from './application/Editor.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { Repl } from './cli/Repl.js';
import { NodeFileStore } from './infrastructure/NodeFileStore.js';
import { SvgXmlCodec } from './infrastructure/SvgXmlCodec.js';

const editor = new Editor(new NodeFileStore(), new SvgXmlCodec());
const repl = new Repl(new CommandDispatcher(editor));
await repl.run(process.stdin, process.stdout, Boolean(process.stdin.isTTY));
