import {
  computeNeedsAnalysis,
  fileNeedsAnalysisFromPriorState,
} from './flaky-needs-analysis';

describe('fileNeedsAnalysisFromPriorState', () => {
  it('needs analysis when there is no prior state', () => {
    expect(fileNeedsAnalysisFromPriorState(undefined)).toBe(true);
  });

  it('needs analysis when the prior review never completed', () => {
    expect(
      fileNeedsAnalysisFromPriorState({
        analyzedSha: 'abc',
        patternsReviewed: false,
      }),
    ).toBe(true);
  });

  it('needs analysis when patternsReviewed is absent', () => {
    expect(
      fileNeedsAnalysisFromPriorState({
        analyzedSha: 'abc',
      }),
    ).toBe(true);
  });

  it('skips the prior-state check when Stage 2 reviewed that SHA', () => {
    expect(
      fileNeedsAnalysisFromPriorState({
        analyzedSha: 'abc',
        patternsReviewed: true,
      }),
    ).toBe(false);
  });
});

describe('computeNeedsAnalysis', () => {
  const reviewed = {
    analyzedSha: 'aaa111',
    patternsReviewed: true,
  };
  const unreviewed = {
    analyzedSha: 'aaa111',
    patternsReviewed: false,
  };

  it('re-analyzes an unreviewed file even when its bytes did not change', () => {
    const result = computeNeedsAnalysis(
      ['app/flaky.test.ts', 'app/clean.test.ts'],
      {
        files: {
          'app/flaky.test.ts': unreviewed,
          'app/clean.test.ts': reviewed,
        },
      },
      {
        headSha: 'bbb222',
        isCommitReachable: () => true,
        diffNameOnly: () => [],
      },
    );

    expect(result.files).toEqual(['app/flaky.test.ts']);
    expect(result.missingPriorShaCount).toBe(0);
  });

  it('still re-analyzes a reviewed file whose bytes changed', () => {
    const result = computeNeedsAnalysis(
      ['app/clean.test.ts'],
      { files: { 'app/clean.test.ts': reviewed } },
      {
        headSha: 'bbb222',
        isCommitReachable: () => true,
        diffNameOnly: () => ['app/clean.test.ts'],
      },
    );

    expect(result.files).toEqual(['app/clean.test.ts']);
  });

  it('returns every modified file when there is no prior comment state', () => {
    expect(
      computeNeedsAnalysis(['a.test.ts', 'b.test.ts'], null, {
        headSha: 'bbb222',
        isCommitReachable: () => true,
        diffNameOnly: () => [],
      }),
    ).toEqual({ files: ['a.test.ts', 'b.test.ts'], missingPriorShaCount: 0 });
  });
});
