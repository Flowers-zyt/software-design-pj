import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FileStore } from '../application/ports/FileStore.js';

export class NodeFileStore implements FileStore {
  read(path: string): string {
    try { return readFileSync(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
  }
  write(path: string, content: string): void {
    // Same-directory rename: a failed write must not truncate the existing SVG.
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    } finally {
      try { unlinkSync(temporary); } catch { /* already renamed or never created */ }
    }
  }
}
