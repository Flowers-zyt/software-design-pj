/** Quotes group tokens; backslashes are preserved except for escaped quotes/backslashes inside quotes. */
export class Tokenizer {
  parse(line: string): readonly string[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: string[] = [];
    let token = '';
    let quoted = false;
    let started = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index]!;
      if (quoted && character === '\\' && ['"', '\\'].includes(line[index + 1] ?? '')) {
        token += line[++index];
        continue;
      }
      if (character === '"') { quoted = !quoted; started = true; continue; }
      if (/\s/u.test(character) && !quoted) {
        if (started) tokens.push(token);
        token = '';
        started = false;
      } else { token += character; started = true; }
    }
    if (quoted) throw new Error('unterminated double quote');
    if (started) tokens.push(token);
    return tokens;
  }
}
