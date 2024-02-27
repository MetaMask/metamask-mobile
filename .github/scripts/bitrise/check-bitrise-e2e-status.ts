import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  const e2eLabel = process.env.E2E_LABEL;
  const removeAndApplyInstructions = `Remove and re-apply the "${e2eLabel}" label to trigger a E2E smoke test on Bitrise.`;

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!e2eLabel) {
    core.setFailed('E2E_LABEL not found');
    process.exit(1);
  }

  const { owner, repo, number: issue_number } = context.issue;
  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  // Get PR information
  const { data: prData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: issue_number,
  });

  // Check if the e2e smoke label is applied
  const labels = prData.labels;
  const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);

  // Pass check since e2e smoke label is not applied
  if (!hasSmokeTestLabel) {
    console.log(
      `"${e2eLabel}" label not applied. Skipping Bitrise status check.`,
    );
    return;
  }

  // Get last 10 commits
  const numberOfCommitsToCheck = 10; // Consider commits older than 10 commits ago invalidated
  const numberOfCommits = prData.commits;
  const commitPage = Math.ceil(numberOfCommits / numberOfCommitsToCheck);

  // Get last 30 comments
  const numberOfCommentsToCheck = 30; // Consider comments older than 30 comments ago invalidated
  const numberOfComments = prData.comments;
  const commentPage = Math.ceil(numberOfComments / numberOfCommentsToCheck);

  // Get comments from PR
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
    page: commentPage,
    per_page: numberOfCommentsToCheck,
  });

  // Get latest commit hash that excludes merges from main
  const { data: commits } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: issue_number,
    page: commitPage,
    per_page: numberOfCommitsToCheck,
  });
  const mergeFromMainCommitMessagePrefix = `Merge branch 'main' into`;
  const nonMergeFromMainCommits = commits.filter(
    (commit) =>
      !commit.commit.message.includes(mergeFromMainCommitMessagePrefix),
  );
  const commitHashToCheck =
    nonMergeFromMainCommits[nonMergeFromMainCommits.length - 1]?.sha;

  if (!commitHashToCheck) {
    core.setFailed(`Commits are invalidated. ${removeAndApplyInstructions}`);
    process.exit(1);
  }

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';
  const latestCommitTag = `<!-- ${commitHashToCheck} -->`;

  // Find Bitrise comment
  const bitriseComment = comments.find(
    ({ body }) => body?.includes(bitriseTag) && body?.includes(latestCommitTag),
  );

  const bitriseCommentPrefix = `Bitrise build status comment for commit ${commitHashToCheck}`;

  // Bitrise comment doesn't exist
  if (!bitriseComment) {
    core.setFailed(
      `${bitriseCommentPrefix} does not exist. ${removeAndApplyInstructions}`,
    );
    process.exit(1);
  }

  // Check Bitrise build status from comment
  const bitriseCommentBody = bitriseComment.body || '';
  if (
    bitriseCommentBody.includes(bitrisePendingTag) ||
    bitriseCommentBody.includes(bitriseFailTag)
  ) {
    core.setFailed(`${bitriseCommentPrefix} is not yet passed.`);
    process.exit(1);
  } else if (bitriseCommentBody.includes(bitriseSuccessTag)) {
    console.log(`${bitriseCommentPrefix} has passed.`);
    return;
  } else {
    core.setFailed(
      `${bitriseCommentPrefix} does not contain any build status. Please verify that the build status tag exists in the comment body.`,
    );
    process.exit(1);
  }
}
