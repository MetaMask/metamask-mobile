import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { externalContributorLabel, E2ELabel, e2eLabels } from './shared/label';
import { Labelable } from './shared/labelable';
import { retrievePullRequest } from './shared/pull-request';

main().catch((error: Error): void => core.setFailed(error));

async function main(): Promise<void> {
  // "GITHUB_TOKEN" is an automatically generated, repository-specific access token provided by GitHub Actions.
  const githubToken = process.env.GITHUB_TOKEN;
  // Retrieve pull request info from context
  const pullRequestRepoOwner = context.repo.owner;
  const pullRequestRepoName = context.repo.repo;
  const pullRequestNumber = context.payload.pull_request?.number;

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!pullRequestNumber) {
    core.setFailed('Pull request number not found');
    return;
  }

  // Initialise octokit, required to call Github GraphQL API
  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  // Retrieve pull request labels
  const pullRequest: Labelable = await retrievePullRequest(
    octokit,
    pullRequestRepoOwner,
    pullRequestRepoName,
    pullRequestNumber,
  );
  const pullRequestLabels =
    pullRequest.labels?.map((labelObject) => labelObject?.name) || [];

  const preventMergeLabels = [
    'needs-qa',
    "QA'd but questions",
    'issues-found',
    'need-ux-ds-review',
    'blocked',
    'stale',
    'DO-NOT-MERGE',
  ];

  let hasTeamLabel = false;
  let hasE2ELabel = false;
  let hasPreventMergeLabel = false;
  let preventMergeLabel = '';

  for (const label of pullRequestLabels) {
    // Check for mandatory team label
    if (label.startsWith('team-') || label === externalContributorLabel.name) {
      hasTeamLabel = true;
      continue;
    }

    // Check for mandatory E2E label
    if (e2eLabels.includes(label as E2ELabel)) {
      hasE2ELabel = true;
      continue;
    }

    // Check for labels that prevent merge
    if (preventMergeLabels.includes(label)) {
      hasPreventMergeLabel = true;
      preventMergeLabel = label;
      continue;
    }
  }

  let errorMessage = '';
  let errorDescription = `Please make sure the PR is appropriately labeled before merging it.\n\nSee labeling guidelines for more detail: https://github.com/MetaMask/metamask-mobile/blob/main/.github/guidelines/LABELING_GUIDELINES.md`;

  if (!hasTeamLabel) {
    errorMessage = `No team labels found on the PR.`;
  } else if (!hasE2ELabel) {
    errorMessage = `No E2E labels found on the PR.`;
  } else if (hasPreventMergeLabel) {
    errorMessage = `PR cannot be merged because it still contains this label: ${preventMergeLabel}.`;
  }
  if (!errorMessage) {
    return;
  }

  core.setFailed(`${errorMessage} ${errorDescription}`);
}
