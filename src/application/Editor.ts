import { SvgDocument } from '../domain/SvgDocument.js';
import type { FileStore } from './ports/FileStore.js';
import type { SvgCodec } from './ports/SvgCodec.js';
import type { EditCommand } from './commands/EditCommand.js';
import { CommandHistory } from './CommandHistory.js';

export class Editor {
  private current: SvgDocument | undefined;
  private currentPath: string | undefined;
  private readonly history = new CommandHistory();
  constructor(private readonly files: FileStore, private readonly codec: SvgCodec) {}

  get document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  init(width = '800', height = '600'): readonly string[] {
    const document = new SvgDocument(width, height);
    this.current = document;
    this.currentPath = undefined;
    this.history.barrier();
    return [`canvas ${document.width}x${document.height} created`];
  }
  read(path: string): readonly string[] {
    const decoded = this.codec.decode(this.files.read(path));
    this.current = decoded.document;
    this.currentPath = path;
    this.history.barrier();
    return [...decoded.warnings, `read ${path} (${this.document.all().length} elements)`];
  }
  save(path?: string): readonly string[] {
    const document = this.document;
    const target = path ?? this.currentPath;
    if (!target) throw new Error('no file path. use save <file.svg>');
    this.files.write(target, this.codec.encode(document));
    this.currentPath = target;
    this.history.barrier();
    return [`saved to ${target} (${document.all().length} elements)`];
  }
  canvas(width?: string, height?: string): readonly string[] {
    if (width === undefined) return [`canvas ${this.document.width}x${this.document.height}`];
    const copy = this.document.clone();
    copy.resize(width, height!);
    this.current = copy;
    this.history.barrier();
    return [`canvas resized to ${copy.width}x${copy.height}`];
  }
  edit(command: EditCommand, args: readonly string[]): readonly string[] {
    const result = this.history.execute(command, this.document, args);
    this.current = result.document;
    return [result.message];
  }
  undo(): readonly string[] {
    void this.document;
    const result = this.history.undo();
    this.current = result.document;
    return [result.message];
  }
  redo(): readonly string[] {
    void this.document;
    const result = this.history.redo();
    this.current = result.document;
    return [result.message];
  }
}
