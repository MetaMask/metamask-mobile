import {
  collectFailures,
  compare,
  isTestOrMock,
} from './lint-react-compiler.mjs';

describe('lint-react-compiler', () => {
  it.each([
    'app/components/Foo/Foo.test.tsx',
    'app/components/Foo/Foo.spec.ts',
    'app/components/Foo/__tests__/helper.tsx',
    'app/util/test/render.tsx',
    'app/e2e/flow.ts',
    'app/__mocks__/thing.ts',
    'app/util/mocks/data.ts',
    'app/components/Foo/Foo.mock.ts',
    'app/components/Foo/mock-data.ts',
    'app/components/Foo/MockProvider.tsx',
  ])('excludes test or mock file %s', (file) => {
    expect(isTestOrMock(file)).toBe(true);
  });

  it.each([
    'app/components/Foo/Foo.tsx',
    'app/components/Testimonial/Testimonial.tsx',
    'app/components/Foo/mockingbird.tsx',
    'app/util/latest.ts',
  ])('keeps app file %s', (file) => {
    expect(isTestOrMock(file)).toBe(false);
  });

  it('collects failures and errors with 1-based columns, skipping tests', () => {
    const report = {
      files: [
        {
          path: 'components/Foo.tsx',
          failed: [
            {
              fnLoc: { start: { line: 1, column: 0 } },
              detail: {
                options: {
                  reason: 'Cannot access refs during render',
                  details: [{ loc: { start: { line: 5, column: 2 } } }],
                },
              },
            },
          ],
          skipped: [
            { fnLoc: { start: { line: 9, column: 0 } }, reason: 'Skipped' },
          ],
        },
        { path: 'components/Foo.test.tsx', failed: [{ reason: 'x' }] },
      ],
      errors: [{ path: 'util/broken.ts', message: 'Unexpected token' }],
    };

    const failures = collectFailures(report, 'app');

    expect(Object.fromEntries(failures)).toStrictEqual({
      'app/components/Foo.tsx': [
        { line: 5, column: 3, reason: 'Cannot access refs during render' },
        { line: 9, column: 1, reason: 'Skipped' },
      ],
      'app/util/broken.ts': [
        { line: 0, column: 0, reason: 'Unexpected token' },
      ],
    });
  });

  it('flags count increases, new files, decreases and removed files', () => {
    const result = compare(
      { 'a.tsx': 2, 'b.tsx': 3, 'c.tsx': 1, 'd.tsx': 4 },
      { 'a.tsx': 2, 'b.tsx': 4, 'd.tsx': 1, 'e.tsx': 1 },
    );

    expect(result).toStrictEqual({
      regressions: [
        { file: 'b.tsx', before: 3, after: 4 },
        { file: 'e.tsx', before: 0, after: 1 },
      ],
      improvements: [
        { file: 'c.tsx', before: 1, after: 0 },
        { file: 'd.tsx', before: 4, after: 1 },
      ],
    });
  });
});
