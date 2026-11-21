import { loadEvalRules } from './eval-rules';
import {
  EVAL_RULES,
  formatAnnotation,
  formatErrorAnnotation,
  isInScopeAppFile,
  lintSource,
  runEvals,
} from './run-design-system-evals';

function addedDiff(filePath: string, bodies: readonly string[]): string {
  return [
    `diff --git a/${filePath} b/${filePath}`,
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -0,0 +1,${bodies.length} @@`,
    ...bodies.map((body) => `+${body}`),
  ].join('\n');
}

describe('EVAL_RULES', () => {
  it('enables exactly the rules from the JSON source', () => {
    expect(Object.keys(EVAL_RULES)).toEqual(
      loadEvalRules().map((config) => config.id),
    );
  });
});

describe('isInScopeAppFile', () => {
  it('accepts app source and rejects tests, specs, stories, and files outside app', () => {
    const files = [
      'app/components/Screen.tsx',
      'app/components/Screen.test.tsx',
      'app/components/Screen.view.test.tsx',
      'app/components/Screen.spec.ts',
      'app/components/Screen.stories.tsx',
      'scripts/design-system/rules/eval-rules.json',
    ];

    expect(files.map(isInScopeAppFile)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('runEvals', () => {
  it('writes a warning annotation for a spacing literal on an added line', () => {
    const filePath = 'app/Screen.tsx';
    const code = 'export const styles = { marginRight: 8 };\n';
    const writes: string[] = [];

    runEvals({
      readDiff: () => addedDiff(filePath, [code.trimEnd()]),
      lintFiles: () => lintSource(filePath, code),
      write: (line) => writes.push(line),
    });

    expect(writes).toEqual([
      formatAnnotation(
        filePath,
        1,
        'Hard-coded spacing value "8" on "marginRight". Use a Box spacing prop (1 unit = 4px, for example marginRight={2}) or twClassName. Intentional exception: add "// ds-exception: <reason>" on this line.',
      ),
    ]);
    expect(writes[0]).toMatch(/^::warning /);
  });

  it('drops a finding that is not on an added line', () => {
    const filePath = 'app/Screen.tsx';
    const writes: string[] = [];

    runEvals({
      readDiff: () => addedDiff(filePath, ['export const untouched = true;']),
      lintFiles: () => [{ filePath, line: 40, message: 'Hard-coded spacing.' }],
      write: (line) => writes.push(line),
    });

    expect(writes).toEqual([]);
  });

  it('throws when lint fails so the check does not pass silently', () => {
    const readDiff = () => addedDiff('app/Screen.tsx', ['export const x = 1;']);

    expect(() =>
      runEvals({
        readDiff,
        lintFiles: () => {
          throw new Error('parse failed');
        },
        write: () => undefined,
      }),
    ).toThrow('parse failed');
  });
});

describe('lintSource', () => {
  it.each([
    ['paddingHorizontal', 16],
    ['rowGap', 8],
  ])('flags %s', (key, value) => {
    expect(lintSource('app/A.tsx', `const s = { ${key}: ${value} };`)).toHaveLength(1);
  });

  it('is not silenced by an inline eslint-disable directive', () => {
    const code = '/* eslint-disable */\nconst s = { marginRight: 8 };';

    expect(lintSource('app/A.tsx', code)).toHaveLength(1);
  });
});

describe('formatErrorAnnotation', () => {
  it('keeps a crash message on one workflow command', () => {
    expect(formatErrorAnnotation('bad\nsha')).toBe('::error::bad%0Asha');
  });
});
