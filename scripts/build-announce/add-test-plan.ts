// RC Test Plan - Adds the AI test plan to the RC build comment posted by index.ts

import { Octokit } from '@octokit/rest';
import {
  getExistingRcComments,
  parseBuildInfo,
  parseGitHubContext,
  readTestPlan,
  updateComment,
} from './utils';
import {
  buildCommentWithTestPlan,
  isNewestRcComment,
} from './test-plan-comment';

async function main(): Promise<void> {
  console.log('\n=== RC Test Plan ===\n');

  const { owner, repo, prNumber, token } = parseGitHubContext();
  const buildInfo = parseBuildInfo();
  const commentId = parseInt(process.env.RC_COMMENT_ID || '', 10);
  if (isNaN(commentId) || commentId <= 0) {
    throw new Error(
      `RC_COMMENT_ID must be a positive integer, got: ${process.env.RC_COMMENT_ID}`,
    );
  }

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`RC comment: ${commentId}`);

  const result = readTestPlan(
    process.env.TEST_PLAN_PATH || 'release-test-plan.json',
    process.env.TEST_PLAN_STATUS,
    buildInfo.semver,
  );
  const { testPlan, error, cancelled } = result;

  if (testPlan) {
    console.log(`Test plan loaded:`);
    console.log(`  - Risk Score: ${testPlan.summary.releaseRiskScore}`);
    console.log(`  - High Risk Scenarios: ${testPlan.scenarios.filter((s) => s.riskLevel === 'high').length}`);
    console.log(`  - Medium Risk Scenarios: ${testPlan.scenarios.filter((s) => s.riskLevel === 'medium').length}`);
    console.log(`  - Teams Signed Off: ${testPlan.signOffs.signedOff.length}/${testPlan.signOffs.signedOff.length + testPlan.signOffs.needsAttention.length}`);
  } else if (cancelled) {
    console.log('Test plan generation was cancelled');
  } else if (error) {
    console.error(`Test plan unavailable: ${error}`);
  } else {
    console.log('Test plan generation was skipped (no AI API keys)');
  }

  const octokit = new Octokit({ auth: token });
  const comments = await getExistingRcComments(octokit, owner, repo, prNumber);
  const comment = comments.find((candidate) => candidate.id === commentId);

  if (!comment) {
    console.log('The RC comment no longer exists. Nothing to update.');
    return;
  }

  if (!isNewestRcComment(comments, commentId)) {
    console.log('A newer RC comment exists. Leaving this build superseded.');
    return;
  }

  const body = buildCommentWithTestPlan(
    comment.body,
    result,
    buildInfo.pipelineUrl,
  );

  if (body === comment.body) {
    console.log('RC comment is already up to date.');
    return;
  }

  await updateComment(octokit, owner, repo, commentId, body);
  console.log(`Updated RC comment ${commentId}`);
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
