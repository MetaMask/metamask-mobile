import {
  type Baseline,
  type FileResult,
  compareWithBaseline,
  parseBaseline,
  serializeBaseline,
  summarize,
  toBaselineEntry,
  updateBaseline,
} from './baseline';

const REFS = 'Cannot access refs during render';
const TRY = 'Support value blocks within a try/catch statement';

const failure = (reason: string, line = 1) => ({ line, column: 0, reason });

describe('toBaselineEntry', () => {
  it('counts failures and keeps unique sorted reasons', () => {
    expect(
      toBaselineEntry([failure(TRY), failure(REFS), failure(TRY)]),
    ).toEqual({ count: 3, reasons: [REFS, TRY] });
  });
});

describe('serializeBaseline', () => {
  it('sorts paths and reasons so the output is stable', () => {
    const baseline: Baseline = {
      'app/b.tsx': { count: 2, reasons: [TRY, REFS] },
      'app/a.tsx': { count: 1, reasons: [REFS] },
    };

    const text = serializeBaseline(baseline);

    expect(Object.keys(JSON.parse(text))).toEqual(['app/a.tsx', 'app/b.tsx']);
    expect(JSON.parse(text)['app/b.tsx'].reasons).toEqual([REFS, TRY]);
    expect(text.endsWith('}\n')).toBe(true);
    expect(serializeBaseline(JSON.parse(text))).toBe(text);
  });
});

describe('parseBaseline', () => {
  it('round trips a serialized baseline', () => {
    const baseline = { 'app/a.tsx': { count: 1, reasons: [REFS] } };

    expect(parseBaseline(serializeBaseline(baseline))).toEqual(baseline);
  });

  it.each([
    ['an array', '[]'],
    ['a zero count', '{"app/a.tsx":{"count":0,"reasons":[]}}'],
    ['a fractional count', '{"app/a.tsx":{"count":1.5,"reasons":[]}}'],
    ['missing reasons', '{"app/a.tsx":{"count":1}}'],
    ['non-string reasons', '{"app/a.tsx":{"count":1,"reasons":[1]}}'],
  ])('rejects %s', (_label, text) => {
    expect(() => parseBaseline(text)).toThrow();
  });
});

describe('compareWithBaseline', () => {
  const baseline: Baseline = {
    'app/known.tsx': { count: 2, reasons: [REFS, TRY] },
  };

  it('passes when failures match the baseline', () => {
    const results: FileResult[] = [
      { path: 'app/known.tsx', failures: [failure(TRY), failure(REFS)] },
      { path: 'app/clean.tsx', failures: [] },
    ];

    expect(
      compareWithBaseline(results, baseline, ['app/known.tsx', 'app/clean.tsx']),
    ).toEqual({ regressions: [], improvements: [] });
  });

  it('reports a new failing file with its failures', () => {
    const failures = [failure(REFS, 12)];

    const { regressions, improvements } = compareWithBaseline(
      [{ path: 'app/clean.tsx', failures }],
      baseline,
      ['app/clean.tsx'],
    );

    expect(improvements).toEqual([]);
    expect(regressions).toEqual([
      {
        path: 'app/clean.tsx',
        baselineCount: 0,
        count: 1,
        newReasons: [REFS],
        failures,
      },
    ]);
  });

  it('reports a count increase in a baselined file', () => {
    const { regressions } = compareWithBaseline(
      [
        {
          path: 'app/known.tsx',
          failures: [failure(REFS), failure(REFS), failure(TRY)],
        },
      ],
      baseline,
      ['app/known.tsx'],
    );

    expect(regressions).toMatchObject([
      { path: 'app/known.tsx', baselineCount: 2, count: 3, newReasons: [] },
    ]);
  });

  it('reports a new reason even when the count stays the same', () => {
    const { regressions } = compareWithBaseline(
      [{ path: 'app/known.tsx', failures: [failure(REFS), failure('Other')] }],
      baseline,
      ['app/known.tsx'],
    );

    expect(regressions).toMatchObject([
      { path: 'app/known.tsx', count: 2, newReasons: ['Other'] },
    ]);
  });

  it('reports a fixed file as an improvement', () => {
    expect(
      compareWithBaseline(
        [{ path: 'app/known.tsx', failures: [] }],
        baseline,
        ['app/known.tsx'],
      ),
    ).toEqual({
      regressions: [],
      improvements: [{ path: 'app/known.tsx', baselineCount: 2, count: 0 }],
    });
  });

  it('reports a partly fixed file as an improvement', () => {
    const { improvements } = compareWithBaseline(
      [{ path: 'app/known.tsx', failures: [failure(TRY)] }],
      baseline,
      ['app/known.tsx'],
    );

    expect(improvements).toEqual([
      { path: 'app/known.tsx', baselineCount: 2, count: 1 },
    ]);
  });

  it('reports a baselined file that was deleted as an improvement', () => {
    const { improvements } = compareWithBaseline([], baseline, [
      'app/known.tsx',
    ]);

    expect(improvements).toEqual([
      { path: 'app/known.tsx', baselineCount: 2, count: 0 },
    ]);
  });

  it('ignores baselined files that were not checked', () => {
    expect(compareWithBaseline([], baseline, [])).toEqual({
      regressions: [],
      improvements: [],
    });
  });
});

describe('updateBaseline', () => {
  const baseline: Baseline = {
    'app/known.tsx': { count: 2, reasons: [REFS, TRY] },
    'app/other.tsx': { count: 1, reasons: [REFS] },
  };

  it('removes fixed files and shrinks counts for checked files only', () => {
    expect(
      updateBaseline(
        [
          { path: 'app/known.tsx', failures: [failure(TRY)] },
          { path: 'app/clean.tsx', failures: [] },
        ],
        baseline,
        ['app/known.tsx', 'app/clean.tsx'],
      ),
    ).toEqual({
      'app/known.tsx': { count: 1, reasons: [TRY] },
      'app/other.tsx': { count: 1, reasons: [REFS] },
    });
  });

  it('drops a checked file that is now clean', () => {
    expect(
      updateBaseline([{ path: 'app/other.tsx', failures: [] }], baseline, [
        'app/other.tsx',
      ]),
    ).toEqual({ 'app/known.tsx': { count: 2, reasons: [REFS, TRY] } });
  });

  it('records new failing files', () => {
    expect(
      updateBaseline([{ path: 'app/new.tsx', failures: [failure(REFS)] }], {}, [
        'app/new.tsx',
      ]),
    ).toEqual({ 'app/new.tsx': { count: 1, reasons: [REFS] } });
  });
});

describe('summarize', () => {
  it('totals files and failures', () => {
    expect(
      summarize({
        'app/a.tsx': { count: 2, reasons: [REFS] },
        'app/b.tsx': { count: 3, reasons: [TRY] },
      }),
    ).toEqual({ files: 2, failures: 5 });
  });
});
