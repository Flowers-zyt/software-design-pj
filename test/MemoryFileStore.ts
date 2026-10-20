import type { FileStore } from '../src/application/ports/FileStore.js';

export class MemoryFileStore implements FileStore {
  private readonly contents = new Map<string, string>();
  read(path: string): string {
    const source = this.contents.get(path);
    if (source === undefined) throw new Error(`cannot read file: ${path}`);
    return source;
  }
  write(path: string, source: string): void { this.contents.set(path, source); }
}
