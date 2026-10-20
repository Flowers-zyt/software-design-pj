import type { SvgDocument } from '../domain/SvgDocument.js';

/** Owns snapshots that are never handed out for mutation. */
export class HistoryEntry {
  private readonly before: SvgDocument;
  private readonly after: SvgDocument;
  private readonly description: string;
  constructor(before: SvgDocument, after: SvgDocument, description: string) {
    this.before = before.clone();
    this.after = after.clone();
    this.description = description;
  }
  undo(): SvgDocument { return this.before.clone(); }
  redo(): SvgDocument { return this.after.clone(); }
  get summary(): string { return this.description; }
}
