/**
 * Markdown for the Actions job Summary tab so skip vs post is visible
 * without opening step logs.
 */
import { appendFileSync } from 'fs';
export type FlakyJobSummaryInput = {
  headSha: string;
  shouldAnalyze: string;
  skipReason: string;
  hasTestFiles: string;
  modifiedFileCount: string;
  filesToAnalyzeCount: string;
  historicallyFlakyCount: string;
  unreadFailedRuns: string;
  missingPriorShaCount: string;
  commentPosted: string;
  commentAction: string;
  findingCount: string;
  stage3SkipReason: string;
  checkoutOutcome: string;
  installOutcome: string;
  stage1Outcome: string;
  skillSyncOutcome: string;
  aiCheckoutOutcome: string;
  aiInstallOutcome: string;
  aiOutcome: string;
  stage3Outcome: string;
};

const shortSha = (sha: string): string =>
  sha.length >= 7 ? sha.slice(0, 7) : sha || 'unknown';

const outcomeLabel = (outcome: string): string => {
  if (outcome === 'success') {
    return 'ok';
  }
  if (outcome === 'failure') {
    return 'failed';
  }
  if (outcome === 'skipped') {
    return 'skipped';
  }
  if (outcome === 'cancelled') {
    return 'cancelled';
  }
  return outcome || 'did not run';
};

const commentActionLabel = (action: string): string => {
  if (action === 'created') {
    return 'created';
  }
  if (action === 'updated') {
    return 'updated';
  }
  if (action === 'all_clear') {
    return 'all-clear';
  }
  return 'not posted';
};

const skipReasonLabel = (reason: string): string => {
  if (reason === 'no_modified_unit_tests') {
    return 'No modified unit test files.';
  }
  if (reason === 'unchanged_since_last_analysis') {
    return 'Modified tests are unchanged since last analysis.';
  }
  if (reason === 'stage1_crash') {
    return 'Stage 1 crashed.';
  }
  if (reason === 'git_diff_failed') {
    return 'git diff failed.';
  }
  if (reason === 'missing_token') {
    return 'Missing GitHub token.';
  }
  if (reason === 'prior_state_fetch_failed') {
    return 'Prior sticky-comment state fetch failed.';
  }
  if (reason === 'list_runs_failed') {
    return 'listWorkflowRuns failed.';
  }
  if (reason === 'missing_token_or_pr') {
    return 'Missing token, repo, or PR number.';
  }
  if (reason === 'history_artifact_missing') {
    return 'History artifact missing.';
  }
  if (reason === 'comment_api_failed') {
    return 'Sticky comment API call failed.';
  }
  if (reason === 'stage3_crash') {
    return 'Stage 3 crashed.';
  }
  return reason;
};

const stageOutcomesFailed = (input: FlakyJobSummaryInput): boolean =>
  input.stage1Outcome === 'failure' ||
  input.skillSyncOutcome === 'failure' ||
  input.aiCheckoutOutcome === 'failure' ||
  input.aiInstallOutcome === 'failure' ||
  input.aiOutcome === 'failure' ||
  input.stage3Outcome === 'failure';

export const renderFlakyJobSummary = (input: FlakyJobSummaryInput): string => {
  const setupStopped =
    input.checkoutOutcome === 'failure' ||
    input.installOutcome === 'failure' ||
    input.stage1Outcome === '' ||
    input.stage1Outcome === 'skipped';

  let headline: string;
  if (
    setupStopped &&
    input.stage1Outcome !== 'success' &&
    input.stage1Outcome !== 'failure'
  ) {
    headline =
      '**Stopped before analysis.** Checkout, base-branch fetch, Node setup, or yarn install did not complete.';
  } else if (input.stage1Outcome === 'failure') {
    headline = `**Failed to gather history.** ${skipReasonLabel(input.skipReason) || 'Stage 1 failed.'}`;
  } else if (input.shouldAnalyze !== 'true') {
    headline = `**Skipped.** ${skipReasonLabel(input.skipReason) || 'Analyzer and comment were not run.'}`;
  } else if (input.commentPosted === 'true') {
    headline = `**Posted sticky comment** (${commentActionLabel(input.commentAction)}).`;
  } else if (input.stage3SkipReason) {
    headline = `**Analyzed; comment not posted.** ${skipReasonLabel(input.stage3SkipReason)}`;
  } else {
    headline = '**Analyzed.** Check the comment step below.';
  }

  const aiLine =
    input.shouldAnalyze !== 'true'
      ? 'skipped'
      : input.aiOutcome === 'success'
        ? 'completed'
        : input.aiOutcome === 'skipped'
          ? 'skipped (fork PR or secrets unavailable)'
          : input.aiOutcome === 'failure'
            ? 'failed'
            : 'did not run';

  const commentLine =
    input.commentPosted === 'true'
      ? commentActionLabel(input.commentAction)
      : 'not posted';

  const jobResult = stageOutcomesFailed(input)
    ? 'failed (a stage failed)'
    : 'passed';

  return `## Flaky unit test detection

${headline}

| | |
| --- | --- |
| Job result | ${jobResult} |
| SHA | \`${shortSha(input.headSha)}\` |
| Has unit test files | ${input.hasTestFiles || 'unknown'} |
| Modified unit test files | ${input.modifiedFileCount || '0'} |
| Files re-analyzed | ${input.filesToAnalyzeCount || '0'} |
| Historically flaky files | ${input.historicallyFlakyCount || '0'} |
| Unread failed CI runs | ${input.unreadFailedRuns || '0'} |
| Missing prior SHAs | ${input.missingPriorShaCount || '0'} |
| AI findings | ${input.findingCount || '0'} |
| AI analysis | ${aiLine} |
| Comment | ${commentLine} |
| Checkout | ${outcomeLabel(input.checkoutOutcome)} |
| Install | ${outcomeLabel(input.installOutcome)} |
| History sampling | ${outcomeLabel(input.stage1Outcome)} |
| Skill sync | ${outcomeLabel(input.skillSyncOutcome)} |
| AI checkout | ${outcomeLabel(input.aiCheckoutOutcome)} |
| AI install | ${outcomeLabel(input.aiInstallOutcome)} |
| AI analysis | ${outcomeLabel(input.aiOutcome)} |
| Sticky comment | ${outcomeLabel(input.stage3Outcome)} |
`;
};

const env = (name: string): string => process.env[name] ?? '';

export const writeFlakyJobSummaryFromEnv = (): void => {
  const markdown = renderFlakyJobSummary({
    headSha: env('FLAKY_HEAD_SHA'),
    shouldAnalyze: env('FLAKY_SHOULD_ANALYZE'),
    skipReason: env('FLAKY_SKIP_REASON'),
    hasTestFiles: env('FLAKY_HAS_TEST_FILES'),
    modifiedFileCount: env('FLAKY_MODIFIED_FILE_COUNT'),
    filesToAnalyzeCount: env('FLAKY_FILES_TO_ANALYZE_COUNT'),
    historicallyFlakyCount: env('FLAKY_HISTORICALLY_FLAKY_COUNT'),
    unreadFailedRuns: env('FLAKY_UNREAD_FAILED_RUNS'),
    missingPriorShaCount: env('FLAKY_MISSING_PRIOR_SHA_COUNT'),
    commentPosted: env('FLAKY_COMMENT_POSTED'),
    commentAction: env('FLAKY_COMMENT_ACTION'),
    findingCount: env('FLAKY_FINDING_COUNT'),
    stage3SkipReason: env('FLAKY_STAGE3_SKIP_REASON'),
    checkoutOutcome: env('FLAKY_CHECKOUT_OUTCOME'),
    installOutcome: env('FLAKY_INSTALL_OUTCOME'),
    stage1Outcome: env('FLAKY_STAGE1_OUTCOME'),
    skillSyncOutcome: env('FLAKY_SKILL_SYNC_OUTCOME'),
    aiCheckoutOutcome: env('FLAKY_AI_CHECKOUT_OUTCOME'),
    aiInstallOutcome: env('FLAKY_AI_INSTALL_OUTCOME'),
    aiOutcome: env('FLAKY_AI_OUTCOME'),
    stage3Outcome: env('FLAKY_STAGE3_OUTCOME'),
  });

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    appendFileSync(summaryPath, markdown);
  } else {
    process.stdout.write(markdown);
  }
};

if (require.main === module) {
  writeFlakyJobSummaryFromEnv();
}
