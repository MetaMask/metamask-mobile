import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SPACING_RULE_ID } from './spacing-rule';
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
  it('enables the spacing rule from the shared map', () => {
    const ruleIds = Object.keys(EVAL_RULES);

    expect(ruleIds).toEqual([SPACING_RULE_ID]);
  });
});

describe('isInScopeAppFile', () => {
  it('accepts an app source file', () => {
    const filePath = 'app/components/Screen.tsx';

    const inScope = isInScopeAppFile(filePath);

    expect(inScope).toBe(true);
  });

  it('rejects tests, specs, stories, and files outside app', () => {
    const files = [
      'app/components/Screen.test.tsx',
      'app/components/Screen.view.test.tsx',
      'app/components/Screen.spec.ts',
      'app/components/Screen.stories.tsx',
      'scripts/design-system/spacing-rule.ts',
      '.github/workflows/ci.yml',
    ];

    const inScope = files.map(isInScopeAppFile);

    expect(inScope).toEqual([false, false, false, false, false, false]);
  });
});

describe('runEvals', () => {
  it('writes an annotation and returns 1 for a spacing literal on an added line', () => {
    const filePath = 'app/Screen.tsx';
    const code = 'export const styles = { marginRight: 8 };\n';
    const writes: string[] = [];

    const codeResult = runEvals({
      readDiff: () => addedDiff(filePath, [code.trimEnd()]),
      lintFiles: () => lintSource(filePath, code),
      write: (line) => {
        writes.push(line);
      },
    });

    expect(codeResult).toBe(1);
    expect(writes).toEqual([
      formatAnnotation(
        filePath,
        1,
        'Hard-coded spacing value "8" on "marginRight". Use a Box spacing prop (1 unit = 4px, for example marginRight={2}) or twClassName. Intentional exception: add "// ds-exception: <reason>" on this line.',
      ),
    ]);
  });

  it('drops a finding that is not on an added line', () => {
    const filePath = 'app/Screen.tsx';
    const writes: string[] = [];

    const codeResult = runEvals({
      readDiff: () => addedDiff(filePath, ['export const untouched = true;']),
      lintFiles: () => [
        {
          filePath,
          line: 40,
          message: 'Hard-coded spacing value "8" on "marginRight".',
        },
      ],
      write: (line) => {
        writes.push(line);
      },
    });

    expect(codeResult).toBe(0);
    expect(writes).toEqual([]);
  });

  it('does not lint a test file that the diff adds', () => {
    const linted: string[] = [];

    const codeResult = runEvals({
      readDiff: () =>
        addedDiff('app/Screen.test.tsx', ['const styles = { marginRight: 8 };']),
      lintFiles: (files) => {
        linted.push(...files);
        return [];
      },
      write: () => undefined,
    });

    expect(codeResult).toBe(0);
    expect(linted).toEqual([]);
  });

  it('passes a line that has a ds-exception reason', () => {
    const filePath = 'app/Screen.tsx';
    const code = 'export const styles = { marginRight: 8 }; // ds-exception: icon gap\n';
    const writes: string[] = [];

    const codeResult = runEvals({
      readDiff: () => addedDiff(filePath, [code.trimEnd()]),
      lintFiles: () => lintSource(filePath, code),
      write: (line) => {
        writes.push(line);
      },
    });

    expect(codeResult).toBe(0);
    expect(writes).toEqual([]);
  });

  it('suppresses only the line that carries a ds-exception reason', () => {
    const filePath = 'app/design-system-evals-seed/Seed.tsx';
    const code = [
      'export const seed = {',
      '  marginRight: 0,',
      '  marginTop: 8,',
      '  padding: 1,',
      '  gap: 4, // ds-exception: local seed, keep the raw gap',
      '  top: 12,',
      '};',
      '',
    ].join('\n');
    const writes: string[] = [];

    const codeResult = runEvals({
      readDiff: () =>
        addedDiff(
          filePath,
          code.split('\n').filter((line) => line.length > 0),
        ),
      lintFiles: () => lintSource(filePath, code),
      write: (line) => {
        writes.push(line);
      },
    });

    expect(codeResult).toBe(1);
    expect(writes).toEqual([
      formatAnnotation(
        filePath,
        3,
        'Hard-coded spacing value "8" on "marginTop". Use a Box spacing prop (1 unit = 4px, for example marginRight={2}) or twClassName. Intentional exception: add "// ds-exception: <reason>" on this line.',
      ),
      formatAnnotation(
        filePath,
        4,
        'Hard-coded spacing value "1" on "padding". Use a Box spacing prop (1 unit = 4px, for example marginRight={2}) or twClassName. Intentional exception: add "// ds-exception: <reason>" on this line.',
      ),
    ]);
  });

  it('fails a line whose ds-exception reason is empty', () => {
    const filePath = 'app/Screen.tsx';
    const code = 'export const styles = { marginRight: 8 }; // ds-exception:\n';

    const codeResult = runEvals({
      readDiff: () => addedDiff(filePath, [code.trimEnd()]),
      lintFiles: () => lintSource(filePath, code),
      write: () => undefined,
    });

    expect(codeResult).toBe(1);
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

describe('formatErrorAnnotation', () => {
  it('keeps a crash message on one workflow command', () => {
    const message = 'bad\nsha';

    const annotation = formatErrorAnnotation(message);

    expect(annotation).toBe('::error::bad%0Asha');
  });
});

describe('design-system-evals workflow', () => {
  const workflow = readFileSync(
    path.join(__dirname, '../../.github/workflows/design-system-evals.yml'),
    'utf8',
  );

  it('runs only on same-repo pull requests that touch app source', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).not.toContain('pull_request_target');
    expect(workflow).toContain(
      'github.event.pull_request.head.repo.full_name == github.repository',
    );
    expect(workflow).toContain('app/**/*.ts');
    expect(workflow).not.toContain('ci.yml');
    expect(workflow).not.toContain('secrets.');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('name: Design system evals');
  });
});
