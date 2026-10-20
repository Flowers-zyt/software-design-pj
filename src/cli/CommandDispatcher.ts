import type { Editor } from '../application/Editor.js';
import type { Command } from '../application/commands/Command.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ReadCommand } from '../application/commands/ReadCommand.js';
import { SaveCommand } from '../application/commands/SaveCommand.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { UndoCommand } from '../application/commands/UndoCommand.js';
import { RedoCommand } from '../application/commands/RedoCommand.js';
import { Tokenizer } from './Tokenizer.js';

/** The only command-name dispatch point. */
export class CommandDispatcher {
  private readonly tokenizer = new Tokenizer();
  private readonly commands = new Map<string, Command>([
    ['init', new InitCommand()], ['read', new ReadCommand()],
    ['save', new SaveCommand()], ['canvas', new CanvasCommand()],
    ['create', new CreateCommand()], ['delete', new DeleteCommand()],
    ['move', new MoveCommand()], ['scale', new ScaleCommand()], ['set', new SetCommand()],
    ['group', new GroupCommand()], ['ungroup', new UngroupCommand()], ['addto', new AddToCommand()],
    ['front', new FrontCommand()], ['back', new BackCommand()],
    ['tree', new TreeCommand()], ['show', new ShowCommand()], ['help', new HelpCommand()],
    ['undo', new UndoCommand()], ['redo', new RedoCommand()],
  ]);
  constructor(private readonly editor: Editor) {}
  execute(line: string): readonly string[] {
    try {
      const tokens = this.tokenizer.parse(line);
      if (!tokens.length) return [];
      const command = this.commands.get(tokens[0]!);
      if (!command) throw new Error(`unknown command: ${tokens[0]}`);
      return command.execute(this.editor, tokens.slice(1));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n\u2028\u2029]+/gu, ' ')}`];
    }
  }
}
