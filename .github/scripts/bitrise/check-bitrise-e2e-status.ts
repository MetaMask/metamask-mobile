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

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!e2eLabel) {
    core.setFailed('E2E_LABEL not found');
    process.exit(1);
  }

  // Check if the e2e smoke label is applied
  const { owner, repo, number: issue_number } = context.issue;
  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);
  const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number,
  });
  const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);

  // Pass check since e2e smoke label is not applied
  if (!hasSmokeTestLabel) {
    console.log(
      `"${e2eLabel}" label not applied. Skipping Bitrise status check.`,
    );
    return;
  }

  // Get comments from PR
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
  });

  // Get latest commit hash
  const pullRequestResponse = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: issue_number,
  });
  const latestCommitHash = pullRequestResponse.data.head.sha;

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';
  const latestCommitTag = `<!-- ${latestCommitHash} -->`;

  // Find Bitrise comment
  const bitriseComment = comments.find(
    ({ body }) => body?.includes(bitriseTag) && body?.includes(latestCommitTag),
  );

  // Bitrise comment doesn't exist
  if (!bitriseComment) {
    core.setFailed(
      `Bitrise build status comment for commit ${latestCommitHash} does not exist. Remove and re-apply the "${e2eLabel} label to trigger an E2E smoke test on Bitrise for the latest commit."`,
    );
    process.exit(1);
  }

  // Check Bitrise build status from comment
  const bitriseCommentBody = bitriseComment.body || '';
  if (
    bitriseCommentBody.includes(bitrisePendingTag) ||
    bitriseCommentBody.includes(bitriseFailTag)
  ) {
    core.setFailed('Did not detect pass status in last Bitrise comment.');
    process.exit(1);
  } else if (bitriseCommentBody.includes(bitriseSuccessTag)) {
    console.log('Bitrise build has passed.');
    return;
  } else {
    core.setFailed('Could not detect Bitrise build status.');
    process.exit(1);
  }
}
