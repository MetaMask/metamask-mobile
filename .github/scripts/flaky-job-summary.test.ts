import { renderFlakyJobSummary } from './flaky-job-summary';

const baseInput = {
  headSha: 'f758dbb2cc47db67e27f6f49391f423299bff7ff',
  shouldAnalyze: 'true',
  skipReason: '',
  hasTestFiles: 'true',
  modifiedFileCount: '1',
  filesToAnalyzeCount: '1',
  historicallyFlakyCount: '0',
  unreadFailedRuns: '0',
  missingPriorShaCount: '0',
  commentPosted: 'false',
  commentAction: 'none',
  findingCount: '0',
  stage3SkipReason: '',
  checkoutOutcome: 'success',
  installOutcome: 'success',
  stage1Outcome: 'success',
  skillSyncOutcome: 'success',
  aiCheckoutOutcome: 'success',
  aiInstallOutcome: 'success',
  aiOutcome: 'success',
  stage3Outcome: 'success',
};

describe('renderFlakyJobSummary', () => {
  it('reports stopped before analysis when checkout failed', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      checkoutOutcome: 'failure',
      stage1Outcome: '',
      shouldAnalyze: '',
    });

    expect(markdown).toContain('**Stopped before analysis.**');
    expect(markdown).toContain('| Checkout | failed |');
  });

  it('reports skipped when Stage 1 found no modified unit tests', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      shouldAnalyze: 'false',
      skipReason: 'no_modified_unit_tests',
      modifiedFileCount: '0',
      filesToAnalyzeCount: '0',
      aiOutcome: 'skipped',
      stage3Outcome: 'success',
    });

    expect(markdown).toContain('**Skipped.** No modified unit test files.');
    expect(markdown).toContain('| AI analysis | skipped |');
  });

  it('reports created comment when Stage 3 posted', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      commentPosted: 'true',
      commentAction: 'created',
      findingCount: '2',
      historicallyFlakyCount: '1',
    });

    expect(markdown).toContain('**Posted sticky comment** (created).');
    expect(markdown).toContain('| Comment | created |');
    expect(markdown).toContain('| AI findings | 2 |');
  });

  it('reports AI skipped for a fork when analyze ran but AI was skipped', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      commentPosted: 'false',
      commentAction: 'none',
      aiOutcome: 'skipped',
      skillSyncOutcome: 'skipped',
      aiCheckoutOutcome: 'skipped',
      aiInstallOutcome: 'skipped',
    });

    expect(markdown).toContain(
      '| AI analysis | skipped (fork PR or secrets unavailable) |',
    );
    expect(markdown).toContain('**Analyzed.** Check the comment step below.');
  });

  it('reports unread failed runs in the table', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      unreadFailedRuns: '1',
      missingPriorShaCount: '2',
    });

    expect(markdown).toContain('| Unread failed CI runs | 1 |');
    expect(markdown).toContain('| Missing prior SHAs | 2 |');
    expect(markdown).toContain('| SHA | `f758dbb` |');
  });
});
