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

  const owner = context.repo.owner;
  const repo = context.repo.repo;
  const issue_number = context.issue.number;

  const pullRequestLink = `https://github.com/MetaMask/metamask-mobile/pull/${issue_number}`;

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found.');
    process.exit(1);
  }

  if (!e2eLabel) {
    core.setFailed('E2E_LABEL not found.');
    process.exit(1);
  }

  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  // Remove the label
  try {
    const removeLabelResponse = await octokit.rest.issues.removeLabel({
      owner: owner,
      repo: repo,
      issue_number: issue_number,
      name: e2eLabel,
    });
    
    if (removeLabelResponse.status === 200) {
      console.log(`Removed (${e2eLabel}) label from PR ${pullRequestLink}`);
    } else {
      core.setFailed(
        `Failed to remove (${e2eLabel}) label from ${pullRequestLink}`,
      );
      process.exit(1);
    }
  } catch (error) {
    if (error.message.includes('Label does not exist')) {
      console.log(`(${e2eLabel}) label does not exist on ${pullRequestLink}, no need to remove`)
    } else {
      core.setFailed(
        `An error occured when attempting to remove (${e2eLabel}) label from ${pullRequestLink}: ${error}`,
      );
      process.exit(1);
    }
  }

  // Reapply the label
  const applyLabelResponse = await octokit.rest.issues.addLabels({
    owner: owner,
    repo: repo,
    issue_number: issue_number,
    labels: [e2eLabel],
  });

  if (applyLabelResponse.status === 200) {
    console.log(`Re-applied (${e2eLabel}) label to PR ${pullRequestLink}`);
  } else {
    core.setFailed(
      `Failed to re-apply (${e2eLabel}) label to ${pullRequestLink}`,
    );
    process.exit(1);
  }
}
