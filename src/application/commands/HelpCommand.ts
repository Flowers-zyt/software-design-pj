import { NumberValue } from '../../domain/NumberValue.js';
import type { Editor } from '../Editor.js';
import type { Command } from './Command.js';

export class HelpCommand implements Command {
  execute(_editor: Editor, args: readonly string[]): readonly string[] {
    NumberValue.count(args, 0, 0, 'help');
    return [
      'init [w] [h]                         new canvas (default 800x600)',
      'read <file.svg>                      read SVG; assign missing IDs',
      'save [file.svg]                      save SVG; remember successful path',
      'canvas [w h]                         show or resize canvas',
      'create rect <id> <x> <y> <w> <h> [fill] [in <containerId>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
      'create text <id> <x> <y> "content" [in <containerId>]',
      'create g <id> [in <containerId>]',
      'delete <id>                          delete entire subtree',
      'move <id> <dx> <dy>                  move shape or group',
      'scale <id> <factor>                  scale geometry about origin',
      'set <id> <attr> <value>               update allowed attribute',
      'group <newGid> <id1> <id2>...         collect existing shapes in tree order',
      'ungroup <gid>                        dissolve a nested group',
      'addto <gid> <id>                     append an existing shape to group',
      'front <id> / back <id>               reorder within parent',
      'tree [id] / show <id>                inspect structure or properties',
      'undo / redo                         one edit per history entry',
      'help                                display this help',
      'Use double quotes for spaces. # at line start is a comment. EOF exits.',
    ];
  }
}
