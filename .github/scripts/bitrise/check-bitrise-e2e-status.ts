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

  // Check if the "Run Smoke E2E" label is applied
  const { owner, repo, number: issue_number } = context.issue;
  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);
  const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number,
  });
  const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);

  if (!hasSmokeTestLabel) {
    console.log(
      `"${e2eLabel}" label not applied. Skipping Bitrise status check.`,
    );
    return;
  }

  // Check if the "Bitrise build passed!" comment is posted
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
  });

  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';

  const bitriseComments = comments.filter((comment) =>
    comment.body?.includes(bitriseTag),
  );

  if (bitriseComments.length === 0) {
    core.setFailed('Bitrise build comment does not exist.');
  }

  const bitriseComment =
    bitriseComments[bitriseComments.length - 1]?.body || '';

  if (bitriseComment.includes(bitrisePendingTag)) {
    core.setFailed('Bitrise build is pending.');
    return;
  } else if (bitriseComment.includes(bitriseFailTag)) {
    core.setFailed('Bitrise build has failed.');
    return;
  } else if (bitriseComment.includes(bitriseSuccessTag)) {
    console.log('Bitrise build has passed.');
  } else {
    core.setFailed('Could not detect Bitrise build status.');
    return;
  }
}
