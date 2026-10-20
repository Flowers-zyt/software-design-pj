import type { Editor } from '../Editor.js';

export interface Command {
  execute(editor: Editor, args: readonly string[]): readonly string[];
}
