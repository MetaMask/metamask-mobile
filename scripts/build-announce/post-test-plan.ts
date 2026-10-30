// Updates the RC build comment with the AI test plan after the build links are posted.

import { Octokit } from '@octokit/rest';
import {
  removePendingTestPlanSection,
  selectRcCommentForTestPlan,
  type RcCommentSelection,
} from './test-plan-comment';
import {
  applyTestPlanSection,
  buildTestPlanFailureSection,
  buildTestPlanSection,
} from './test-plan-section';
import type { TestPlanResult } from './types';
import {
  generateTestPlan,
  getExistingRcComments,
  parseBuildInfo,
  parseGitHubContext,
  updateComment,
} from './utils';

function hasAiKeys(): boolean {
  return Boolean(
    process.env.E2E_CLAUDE_API_KEY ||
      process.env.E2E_OPENAI_API_KEY ||
      process.env.E2E_GEMINI_API_KEY,
  );
}

async function loadTargetComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  iosBuildNumber: string,
  androidBuildNumber: string,
): Promise<RcCommentSelection> {
  const comments = await getExistingRcComments(octokit, owner, repo, prNumber);
  return selectRcCommentForTestPlan(
    comments,
    iosBuildNumber,
    androidBuildNumber,
  );
}

function logSkippedSelection(selection: RcCommentSelection): void {
  if (selection.status === 'missing') {
    console.log(
      'No RC comment matches this build. Skipping the test plan update.',
    );
    return;
  }

  if (selection.status === 'superseded') {
    console.log(
      'A newer RC comment exists. Leaving that comment for its own test plan.',
    );
  }
}

async function main(): Promise<void> {
  console.log('\n=== RC AI Test Plan ===\n');

  const { owner, repo, prNumber, token } = parseGitHubContext();
  const buildInfo = parseBuildInfo();
  const octokit = new Octokit({ auth: token });

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`Version: ${buildInfo.semver}`);
  console.log(`iOS Build: ${buildInfo.iosBuildNumber}`);
  console.log(`Android Build: ${buildInfo.androidBuildNumber}`);

  let selection = await loadTargetComment(
    octokit,
    owner,
    repo,
    prNumber,
    buildInfo.iosBuildNumber,
    buildInfo.androidBuildNumber,
  );

  if (selection.status !== 'ready') {
    logSkippedSelection(selection);
    return;
  }

  if (!hasAiKeys()) {
    console.log('No AI API keys found. Removing the pending test plan note.');
    const body = removePendingTestPlanSection(selection.comment.body);
    if (body !== selection.comment.body) {
      await updateComment(octokit, owner, repo, selection.comment.id, body);
    }
    return;
  }

  console.log('\n=== Generating AI Test Plan ===\n');

  let testPlan: TestPlanResult | null = null;
  let testPlanError: string | undefined;

  try {
    testPlan = await generateTestPlan(prNumber, buildInfo.semver, 300000);
    if (testPlan) {
      if (!testPlan.version) {
        testPlan.version = buildInfo.semver;
      }
      console.log(
        `Test plan ready. Risk score: ${testPlan.summary.releaseRiskScore}`,
      );
    } else {
      testPlanError = 'Test plan generation failed - check logs for details';
    }
  } catch (error) {
    testPlan = null;
    testPlanError = error instanceof Error ? error.message : String(error);
    console.error(`Test plan generation failed: ${testPlanError}`);
  }

  selection = await loadTargetComment(
    octokit,
    owner,
    repo,
    prNumber,
    buildInfo.iosBuildNumber,
    buildInfo.androidBuildNumber,
  );

  if (selection.status !== 'ready') {
    console.log(
      'This build was superseded while the test plan was generating. Not editing the newer comment.',
    );
    return;
  }

  const section = testPlan
    ? buildTestPlanSection(testPlan)
    : buildTestPlanFailureSection(
        buildInfo.pipelineUrl,
        testPlanError?.slice(0, 1500),
      );

  const body = applyTestPlanSection(selection.comment.body, section);
  console.log(`Updating RC comment ${selection.comment.id}`);
  await updateComment(octokit, owner, repo, selection.comment.id, body);
  console.log('\n=== Done ===\n');
}

main().catch((error) => {
  console.error(error);
  if ((error as { status?: number }).status === 403) {
    console.error(
      'Permission denied. Ensure the GITHUB_TOKEN has "pull-requests: write" permission.',
    );
  }
  process.exit(1);
});
