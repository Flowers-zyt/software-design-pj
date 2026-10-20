import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import ts from 'typescript';

test('production modules obey dependency boundaries and one-class-per-file convention', () => {
  const files = readdirSync('src', { recursive: true }).filter((file): file is string => typeof file === 'string' && file.endsWith('.ts'));
  let classes = 0;
  for (const file of files) {
    const path = resolve('src', file);
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const declarations = source.statements.filter(ts.isClassDeclaration);
    assert.ok(declarations.length <= 1, file);
    for (const declaration of declarations) {
      classes++;
      assert.equal(declaration.name?.text, basename(path, '.ts'), file);
    }
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      if (file.startsWith('domain')) {
        assert.ok(specifier.startsWith('./'), `domain external dependency: ${file} -> ${specifier}`);
      }
      if (file.startsWith('application')) {
        assert.ok(specifier.startsWith('.'), `application external dependency: ${file} -> ${specifier}`);
        const target = resolve(dirname(path), specifier);
        assert.ok(target.startsWith(resolve('src/application')) || target.startsWith(resolve('src/domain')),
          `application outward dependency: ${file} -> ${specifier}`);
      }
    }
  }
  assert.ok(classes >= 35, `expected class-based implementation; found ${classes}`);
});
