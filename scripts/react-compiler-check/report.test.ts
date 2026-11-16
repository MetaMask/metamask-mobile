import {
  MIGRATION_SKILL_URL,
  formatImprovements,
  formatRegressions,
  formatSummary,
} from './report';

describe('formatRegressions', () => {
  it('lists file, line, and reason for each failure and links the skill', () => {
    const text = formatRegressions({
      improvements: [],
      regressions: [
        {
          path: 'app/Foo.tsx',
          baselineCount: 0,
          count: 1,
          newReasons: ['Cannot access refs during render'],
          failures: [
            { line: 12, column: 4, reason: 'Cannot access refs during render' },
          ],
        },
      ],
    });

    expect(text).toContain('app/Foo.tsx (new: 1 failure(s))');
    expect(text).toContain(
      'app/Foo.tsx:12:4  Cannot access refs during render',
    );
    expect(text).toContain(MIGRATION_SKILL_URL);
    expect(text).not.toContain('new reason:');
  });

  it('calls out new reasons in a baselined file', () => {
    const text = formatRegressions({
      improvements: [],
      regressions: [
        {
          path: 'app/Foo.tsx',
          baselineCount: 1,
          count: 1,
          newReasons: ['Other'],
          failures: [{ line: 3, column: 0, reason: 'Other' }],
        },
      ],
    });

    expect(text).toContain('app/Foo.tsx (1 → 1 failure(s))');
    expect(text).toContain('  new reason: Other');
  });

  it('returns an empty string when nothing regressed', () => {
    expect(formatRegressions({ regressions: [], improvements: [] })).toBe('');
  });
});

describe('formatImprovements', () => {
  it('tells the author how to shrink the baseline', () => {
    const text = formatImprovements({
      regressions: [],
      improvements: [{ path: 'app/Foo.tsx', baselineCount: 2, count: 0 }],
    });

    expect(text).toContain('app/Foo.tsx (2 → 0 failure(s))');
    expect(text).toContain(
      'Run `yarn lint:react-compiler --update` to shrink the baseline',
    );
  });
});

describe('formatSummary', () => {
  it('shows totals, deltas, and elapsed time', () => {
    const text = formatSummary(
      { 'app/a.tsx': { count: 3, reasons: ['x'] } },
      { 'app/a.tsx': { count: 1, reasons: ['x'] } },
      10,
      1500,
    );

    expect(text).toBe(
      [
        'React Compiler check: 10 files in 1.5s',
        'Baseline: 1 files / 3 failures',
        'Current:  1 files / 1 failures (0 files, -2 failures)',
      ].join('\n'),
    );
  });
});
