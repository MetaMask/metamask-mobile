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
    process.exit(1);
  }

  const lastBitriseComment =
    bitriseComments[bitriseComments.length - 1]?.body || '';

  // Check Bitrise comment status
  if (
    lastBitriseComment.includes(bitrisePendingTag) ||
    lastBitriseComment.includes(bitriseFailTag)
  ) {
    core.setFailed('Did not detect pass status in last Bitrise comment.');
    process.exit(1);
  } else if (lastBitriseComment.includes(bitriseSuccessTag)) {
    console.log('Bitrise build has passed.');
    return;
  } else {
    core.setFailed('Could not detect Bitrise build status.');
    process.exit(1);
  }
}
