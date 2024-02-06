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
  const pullRequestLink = `https://github.com/MetaMask/metamask-mobile/pull/${context.issue.number}`;

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
  const { data: labels } = await octokit.rest.issues.listLabelsOnIssue({ owner, repo, issue_number });
  const hasSmokeTestLabel = labels.some(label => label.name === e2eLabel);

  if (!hasSmokeTestLabel) {
    console.log(`"${e2eLabel}" label not applied. Skipping Bitrise status check.`)
    return;
  }

//   console.log(`Workflow triggered by the event (${triggerAction})`);

//   switch (triggerAction) {
//     case PullRequestTriggerType.ReadyForReview:
//       shouldTriggerE2E = true;
//       console.log(
//         `Starting E2E smoke since PR has changed to ready for review.`,
//       );
//       break;
//     case PullRequestTriggerType.Labeled:
//       shouldTriggerE2E = e2eLabel === context.payload.label.name;
//       if (!shouldTriggerE2E) {
//         console.log(
//           `Skipping E2E smoke since (${e2eLabel}) is not the label that triggered this workflow.`,
//         );
//       } else {
//         console.log(
//           `Starting E2E smoke since (${e2eLabel}) is the label that triggered this workflow.`,
//         );
//       }
//       break;
//   }

  if (shouldTriggerE2E) {
    // Apply the E2E smoke label
    const { owner, repo, number: issue_number } = context.issue;
    const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);
    try {
      const applyLabelResponse = await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [e2eLabel],
      });
      if (applyLabelResponse.status === 200) {
        console.log(`Applied (${e2eLabel}) label to PR ${pullRequestLink}`);
      } else {
        core.setFailed(
          `Failed to apply (${e2eLabel}) label to ${pullRequestLink}`,
        );
        process.exit(1);
      }
    } catch (error) {
      core.setFailed(`Error occured when applying label: ${error}`);
      process.exit(1);
    }
  }

  // Set the output for the next step to use.
  core.setOutput("shouldTriggerE2E", shouldTriggerE2E);
}
