import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import { E2ELabel, e2eLabels } from './shared/label';

// Flag used by Bitrise to skip step in GH checks.
const BITRISE_SKIP_CI_FLAG = '[skip ci]';
// Identifier for updating flag.
const BITRISE_FLAG_PREFIX = 'Bitrise Flag:';

enum PullRequestTriggerType {
  Labeled = 'labeled',
  Unlabeled = 'unlabeled',
}

main().catch((error: Error): void => core.setFailed(error));

async function main(): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  const { owner, repo, number: prNumber } = context.issue;
  const prAction = context.payload.action as PullRequestTriggerType;
  const prLabel = context.payload.label.name as E2ELabel;

  if (!e2eLabels.includes(prLabel)) {
    console.log('Label is not E2E related. Skipping this step.');
    return;
  }

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found!');
    process.exit(1);
  }

  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  const {
    data: { body: prBody, labels },
  } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  const prLabels = labels.map((label) => label.name);

  /**
   * Update skip flag on PR body
   */
  const updateCIFlagOnBody = (includeSkipFlag: boolean): string => {
    let bodyText = prBody || '';
    const bitriseFlagText = `${BITRISE_FLAG_PREFIX}${BITRISE_SKIP_CI_FLAG}`;
    bodyText = bodyText.replace(bitriseFlagText, BITRISE_FLAG_PREFIX);
    let message = `Removing ${BITRISE_SKIP_CI_FLAG} flag.`;
    if (includeSkipFlag) {
      bodyText = bodyText.replace(
        BITRISE_FLAG_PREFIX,
        `${BITRISE_FLAG_PREFIX}${BITRISE_SKIP_CI_FLAG}`,
      );
      message = `Adding ${BITRISE_SKIP_CI_FLAG} flag.`;
    }
    console.log(message);
    return bodyText;
  };

  /**
   * Identify the other E2E label
   */
  const getOtherE2ELabel = (activeLabel: E2ELabel): E2ELabel => {
    let labelToRemove: E2ELabel;
    if (activeLabel === E2ELabel.RUN_E2E_SMOKE_LABEL) {
      labelToRemove = E2ELabel.NO_E2E_SMOKE_NEEDED;
    } else {
      labelToRemove = E2ELabel.RUN_E2E_SMOKE_LABEL;
    }
    return labelToRemove;
  };

  /**
   * Handle event when E2E label is added
   */
  const handleLabeledAction = async () => {
    try {
      console.log(`${prLabel} label added.`);
      // Remove the other label
      let labelToRemove = getOtherE2ELabel(prLabel);
      // Update Bitrise CI flag on PR body
      let bodyText = updateCIFlagOnBody(
        prLabel === E2ELabel.NO_E2E_SMOKE_NEEDED,
      );
      // Check if other E2E label needs to be removed
      if (prLabels.includes(labelToRemove)) {
        console.log(`Removing label: ${labelToRemove}.`);
        await octokit.rest.issues.removeLabel({
          owner,
          repo,
          issue_number: prNumber,
          name: labelToRemove,
        });
      }
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        body: bodyText,
      });
    } catch (error) {
      core.setFailed(
        `Error occured on labeled action for label: ${prLabel}. ${error}`,
      );
    }
  };

  /**
   * Handle event when E2E label is removed
   */
  const handleUnlabeledAction = async () => {
    try {
      console.log(`${prLabel} label removed.`);
      // Add Bitrise CI Flag on PR body
      let bodyText = updateCIFlagOnBody(true);
      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        body: bodyText,
      });
    } catch (error) {
      core.setFailed(
        `Error occured on unlabeled action for label: ${prLabel}. ${error}`,
      );
    }
  };

  switch (prAction) {
    case PullRequestTriggerType.Labeled:
      handleLabeledAction();
      break;
    case PullRequestTriggerType.Unlabeled:
      handleUnlabeledAction();
      break;
  }
}
