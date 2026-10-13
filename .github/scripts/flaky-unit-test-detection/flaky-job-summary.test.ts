import { renderFlakyJobSummary } from './flaky-job-summary';

const baseInput = {
  headSha: 'f758dbb2cc47db67e27f6f49391f423299bff7ff',
  shouldAnalyze: 'true',
  skipReason: '',
  hasTestFiles: 'true',
  modifiedFileCount: '1',
  filesToAnalyzeCount: '1',
  historicallyFlakyCount: '0',
  carriedAcrossMove: '0',
  missingLogBlobs: '0',
  infrastructureFailures: '0',
  unattributedReruns: '0',
  historyWindow: '2026-06-24 → 2026-09-20, 90d',
  missingPriorShaCount: '0',
  historyComplete: 'true',
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
  aiReviewedCount: '1',
  aiDidNotCompleteFiles: '',
  aiSkippedCapFiles: '',
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
    expect(markdown).toContain('| Pattern findings (merged) | 2 |');
    expect(markdown).toContain('| History hits | 1 of 1 modified file(s) |');
    expect(markdown).toContain('| AI analysis | reviewed 1/1 files |');
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
    expect(markdown).toContain(
      '**Analyzed.** Nothing to report and no comment to clear.',
    );
  });

  it('does not claim success when Stage 3 never reported back', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      commentPosted: 'false',
      commentAction: '',
      stage3SkipReason: '',
      stage3Outcome: 'cancelled',
    });

    expect(markdown).toContain('**Analyzed; comment step cancelled.**');
  });

  it('reports the gaps the index disclosed in the table', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      missingLogBlobs: '3',
      infrastructureFailures: '2',
      unattributedReruns: '4',
      missingPriorShaCount: '2',
    });

    expect(markdown).toContain('| Missing log blobs | 3 |');
    expect(markdown).toContain('| Lost runners | 2 |');
    expect(markdown).toContain('| Unattributed re-runs | 4 |');
    expect(markdown).toContain('| Missing prior SHAs | 2 |');
    expect(markdown).toContain('| SHA | `f758dbb` |');
  });

  it('reports the window the index covers', () => {
    const markdown = renderFlakyJobSummary(baseInput);

    expect(markdown).toContain(
      '| History index | 2026-06-24 → 2026-09-20, 90d, complete |',
    );
  });

  it('marks a stale or gappy index as incomplete', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      historyWindow: '2026-06-24 → 2026-09-15, 84d, 5d stale',
      historyComplete: 'false',
    });

    expect(markdown).toContain(
      '| History index | 2026-06-24 → 2026-09-15, 84d, 5d stale, incomplete |',
    );
  });

  // Moved files are routine here, so a reader needs to know when a count came
  // from a path the file no longer has.
  it('counts files whose history was carried across a move', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      carriedAcrossMove: '3',
    });

    expect(markdown).toContain('| History carried across a move | 3 |');
  });

  it('reports posted all-clear when Stage 3 posted after no modified unit tests', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      shouldAnalyze: 'false',
      skipReason: 'no_modified_unit_tests',
      commentPosted: 'true',
      commentAction: 'all_clear',
      modifiedFileCount: '0',
      filesToAnalyzeCount: '0',
      aiOutcome: 'skipped',
      stage3Outcome: 'success',
    });

    expect(markdown).toContain('**Posted sticky comment** (all-clear).');
    expect(markdown).toContain('| Comment | all-clear |');
  });

  it('reports Job result passed on the happy path', () => {
    const markdown = renderFlakyJobSummary(baseInput);

    expect(markdown).toContain('| Job result | passed |');
    expect(markdown).toContain('| AI analysis | reviewed 1/1 files |');
  });

  it('lists files that did not complete or exceeded the cap', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      filesToAnalyzeCount: '3',
      aiReviewedCount: '1',
      aiDidNotCompleteFiles: 'a.test.ts',
      aiSkippedCapFiles: 'b.test.ts',
    });

    expect(markdown).toContain(
      '| AI analysis | reviewed 1/3 files; did not complete: a.test.ts; over cap: b.test.ts |',
    );
  });

  it('explains an AI skip caused by a comment-only refresh', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      filesToAnalyzeCount: '0',
      aiOutcome: 'skipped',
      aiReviewedCount: '0',
    });

    expect(markdown).toContain(
      '| AI analysis | skipped (no file needed a new review) |',
    );
  });

  it('reports Job result failed when Stage 1 outcome is failure', () => {
    const markdown = renderFlakyJobSummary({
      ...baseInput,
      stage1Outcome: 'failure',
      skipReason: '',
      shouldAnalyze: '',
    });

    expect(markdown).toContain('| Job result | failed (a stage failed) |');
    expect(markdown).toContain('**Failed to gather history.** Stage 1 failed.');
  });

  it('labels new Stage 1 skip reasons', () => {
    expect(
      renderFlakyJobSummary({
        ...baseInput,
        shouldAnalyze: 'false',
        skipReason: 'git_diff_failed',
        stage1Outcome: 'failure',
      }),
    ).toContain('**Failed to gather history.** git diff failed.');

    expect(
      renderFlakyJobSummary({
        ...baseInput,
        shouldAnalyze: 'false',
        skipReason: 'missing_token',
        stage1Outcome: 'failure',
      }),
    ).toContain('**Failed to gather history.** Missing GitHub token.');

    expect(
      renderFlakyJobSummary({
        ...baseInput,
        shouldAnalyze: 'false',
        skipReason: 'prior_state_fetch_failed',
        stage1Outcome: 'failure',
      }),
    ).toContain(
      '**Failed to gather history.** Prior sticky-comment state fetch failed.',
    );

    expect(
      renderFlakyJobSummary({
        ...baseInput,
        shouldAnalyze: 'false',
        skipReason: 'list_runs_failed',
        stage1Outcome: 'failure',
      }),
    ).toContain('**Failed to gather history.** listWorkflowRuns failed.');
  });
});
