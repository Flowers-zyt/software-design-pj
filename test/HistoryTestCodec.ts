import type { SvgCodec } from '../src/application/ports/SvgCodec.js';
import type { SvgDocument } from '../src/domain/SvgDocument.js';

/** Deliberately excludes XML: these tests exercise only application history. */
export class HistoryTestCodec implements SvgCodec {
  decode(): never { throw new Error('decode not implemented by history test double'); }
  encode(document: SvgDocument): string { return JSON.stringify(document.all().map(shape => shape.attributes())); }
}
