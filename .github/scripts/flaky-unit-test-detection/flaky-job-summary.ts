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
  carriedAcrossMove: string;
  missingLogBlobs: string;
  infrastructureFailures: string;
  unattributedReruns: string;
  historyWindow: string;
  missingPriorShaCount: string;
  historyComplete: string;
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
  aiReviewedCount: string;
  aiDidNotCompleteFiles: string;
  aiSkippedCapFiles: string;
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

const describeAiAnalysis = (input: FlakyJobSummaryInput): string => {
  if (input.shouldAnalyze !== 'true') {
    return 'skipped';
  }
  // Stage 1 still runs Stage 3 with nothing to analyze when only the set of
  // modified test files changed, so the comment can drop the files that left.
  if ((input.filesToAnalyzeCount || '0') === '0') {
    return 'skipped (no file needed a new review)';
  }
  if (input.aiOutcome === 'skipped') {
    return 'skipped (fork PR or secrets unavailable)';
  }
  if (input.aiOutcome !== 'success' && input.aiOutcome !== 'failure') {
    return input.aiOutcome === '' ? 'did not run' : input.aiOutcome;
  }

  const requested = input.filesToAnalyzeCount || '0';
  const reviewed = input.aiReviewedCount || '0';
  const parts = [`reviewed ${reviewed}/${requested} files`];
  if (input.aiDidNotCompleteFiles) {
    parts.push(`did not complete: ${input.aiDidNotCompleteFiles}`);
  }
  if (input.aiSkippedCapFiles) {
    parts.push(`over cap: ${input.aiSkippedCapFiles}`);
  }
  return parts.join('; ');
};

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
  } else if (input.commentPosted === 'true') {
    headline = `**Posted sticky comment** (${commentActionLabel(input.commentAction)}).`;
  } else if (input.shouldAnalyze !== 'true') {
    headline = `**Skipped.** ${skipReasonLabel(input.skipReason) || 'Analyzer and comment were not run.'}`;
  } else if (input.stage3SkipReason) {
    headline = `**Analyzed; comment not posted.** ${skipReasonLabel(input.stage3SkipReason)}`;
  } else if (input.commentAction === 'none') {
    headline = '**Analyzed.** Nothing to report and no comment to clear.';
  } else {
    // Stage 3 neither posted nor named a reason, which means it never
    // reported back — saying "analyzed" would hide that.
    headline = `**Analyzed; comment step ${outcomeLabel(input.stage3Outcome)}.**`;
  }

  const aiLine = describeAiAnalysis(input);

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
| History hits | ${input.historicallyFlakyCount || '0'} of ${input.modifiedFileCount || '0'} modified file(s) |
| History index | ${input.historyWindow || 'not read'}${input.historyComplete === 'true' ? ', complete' : input.historyComplete === 'false' ? ', incomplete' : ''} |
| History carried across a move | ${input.carriedAcrossMove || '0'} |
| Missing log blobs | ${input.missingLogBlobs || '0'} |
| Lost runners | ${input.infrastructureFailures || '0'} |
| Unattributed re-runs | ${input.unattributedReruns || '0'} |
| Missing prior SHAs | ${input.missingPriorShaCount || '0'} |
| Pattern findings (merged) | ${input.findingCount || '0'} |
| AI analysis | ${aiLine} |
| Comment | ${commentLine} |
| Checkout | ${outcomeLabel(input.checkoutOutcome)} |
| Install | ${outcomeLabel(input.installOutcome)} |
| History sampling | ${outcomeLabel(input.stage1Outcome)} |
| Skill sync | ${outcomeLabel(input.skillSyncOutcome)} |
| AI checkout | ${outcomeLabel(input.aiCheckoutOutcome)} |
| AI install | ${outcomeLabel(input.aiInstallOutcome)} |
| AI analysis step | ${outcomeLabel(input.aiOutcome)} |
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
    carriedAcrossMove: env('FLAKY_CARRIED_ACROSS_MOVE'),
    missingLogBlobs: env('FLAKY_MISSING_LOG_BLOBS'),
    infrastructureFailures: env('FLAKY_INFRASTRUCTURE_FAILURES'),
    unattributedReruns: env('FLAKY_UNATTRIBUTED_RERUNS'),
    historyWindow: env('FLAKY_HISTORY_WINDOW'),
    missingPriorShaCount: env('FLAKY_MISSING_PRIOR_SHA_COUNT'),
    historyComplete: env('FLAKY_HISTORY_COMPLETE'),
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
    aiReviewedCount: env('FLAKY_AI_REVIEWED_COUNT'),
    aiDidNotCompleteFiles: env('FLAKY_AI_DID_NOT_COMPLETE_FILES'),
    aiSkippedCapFiles: env('FLAKY_AI_SKIPPED_CAP_FILES'),
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
