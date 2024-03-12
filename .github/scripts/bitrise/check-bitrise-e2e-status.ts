import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
  PullRequestTriggerType,
  StatusCheckStatusType,
} from '../scripts.types';
import axios from 'axios';

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  const e2eLabel = process.env.E2E_LABEL;
  const e2ePipeline = process.env.E2E_PIPELINE;
  const workflowName = process.env.WORKFLOW_NAME;
  const triggerAction = context.payload.action as PullRequestTriggerType;
  const { owner, repo, number: pullRequestNumber } = context.issue;
  let shouldTriggerE2E = false;
  const removeAndApplyInstructions = `Remove and re-apply the "${e2eLabel}" label to trigger a E2E smoke test on Bitrise.`;
  const mergeFromMainCommitMessagePrefix = `Merge branch 'main' into`;
  const pullRequestLink = `https://github.com/MetaMask/metamask-mobile/pull/${pullRequestNumber}`;

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!e2eLabel) {
    core.setFailed('E2E_LABEL not found');
    process.exit(1);
  }

  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  // Get the latest commit hash
  const { data: prData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });
  const latestCommitHash = prData.head.sha;

  // Check if the e2e smoke label is applied
  const labels = prData.labels;
  const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);

  // Pass check since e2e smoke label is not applied
  if (!hasSmokeTestLabel) {
    console.log(
      `"${e2eLabel}" label not applied. Skipping Bitrise status check.`,
    );
    const createStatusCheckResponse = await octokit.rest.checks.create({
      owner,
      repo,
      name: 'Bitrise E2E Status', // Name of the check
      head_sha: latestCommitHash,
      status: StatusCheckStatusType.Success, // Mark the check as pending
      started_at: new Date().toISOString(),
      output: {
        title: 'Skipping E2E smoke test runs',
        summary: 'Skip run since no E2E smoke label is applied', //'The tests are currently running...',
      },
    });

    if (createStatusCheckResponse.status === 201) {
      console.log(
        `Created 'Bitrise E2E Status' check for commit ${latestCommitHash}`,
      );
    } else {
      core.setFailed(
        `Failed to create 'Bitrise E2E Status' check for commit ${latestCommitHash} with status code ${createStatusCheckResponse.status}`,
      );
      process.exit(1);
    }
    return;
  }

  // Check if E2E build should be kicked off
  if (
    triggerAction === PullRequestTriggerType.Labeled &&
    context.payload?.label?.name === e2eLabel
  ) {
    shouldTriggerE2E = true;
    // Configure Bitrise configuration for API call
    const data = {
      build_params: {
        branch: process.env.GITHUB_HEAD_REF,
        pipeline_id: e2ePipeline,
        environments: [
          {
            mapped_to: 'GITHUB_PR_NUMBER',
            value: `${pullRequestNumber}`,
            is_expand: true,
          },
          {
            mapped_to: 'TRIGGERED_BY_PR_LABEL',
            value: `true`,
            is_expand: true,
          },
          {
            mapped_to: 'GITHUB_PR_HASH',
            value: `${latestCommitHash}`,
            is_expand: true,
          },
        ],
        commit_message: `Triggered by (${workflowName}) workflow in ${pullRequestLink}`,
      },
      hook_info: {
        type: 'bitrise',
        build_trigger_token: process.env.BITRISE_BUILD_TRIGGER_TOKEN,
      },
      triggered_by: workflowName,
    };

    const bitriseProjectUrl = `https://app.bitrise.io/app/${process.env.BITRISE_APP_ID}`;
    const bitriseBuildStartUrl = `${bitriseProjectUrl}/build/start.json`;

    // Start Bitrise build.
    const bitriseBuildResponse = await axios.post(bitriseBuildStartUrl, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  return;

  // // Define Bitrise comment tags
  // const bitriseTag = '<!-- BITRISE_TAG -->';
  // const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  // const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  // const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';

  // // Get at least the last 30 comments
  // const numberOfTotalComments = prData.comments;
  // const numberOfCommentsToCheck = 30;
  // const lastCommentPage = Math.ceil(
  //   numberOfTotalComments / numberOfCommentsToCheck,
  // );
  // const { data: latestCommentBatch } = await octokit.rest.issues.listComments({
  //   owner,
  //   repo,
  //   issue_number: pullRequestNumber,
  //   page: lastCommentPage,
  //   per_page: numberOfCommentsToCheck,
  // });
  // let comments = [...latestCommentBatch];
  // if (
  //   numberOfTotalComments % numberOfCommentsToCheck !== 0 &&
  //   lastCommentPage > 1
  // ) {
  //   // Also fetch previous 30 comments
  //   const { data: previousCommentBatch } =
  //     await octokit.rest.issues.listComments({
  //       owner,
  //       repo,
  //       issue_number: pullRequestNumber,
  //       page: lastCommentPage - 1,
  //       per_page: numberOfCommentsToCheck,
  //     });
  //   comments = [...previousCommentBatch, ...comments];
  // }

  // const bitriseComment = comments
  //   .reverse()
  //   .find(({ body }) => body?.includes(bitriseTag));

  // // Bitrise comment doesn't exist
  // if (!bitriseComment) {
  //   core.setFailed(
  //     `No Bitrise build status comment found. ${removeAndApplyInstructions}`,
  //   );
  //   process.exit(1);
  // }

  // // This regex matches a 40-character hexadecimal string enclosed within <!-- and -->
  // let bitriseCommentBody = bitriseComment.body || '';
  // const commitTagRegex = /<!--\s*([0-9a-f]{40})\s*-->/i;
  // const hashMatch = bitriseCommentBody.match(commitTagRegex);
  // let bitriseCommentCommitHash = hashMatch && hashMatch[1] ? hashMatch[1] : '';

  // // Get at least the last 10 commits
  // const numberOfTotalCommits = prData.commits;
  // const numberOfCommitsToCheck = 10;
  // const lastCommitPage = Math.ceil(
  //   numberOfTotalCommits / numberOfCommitsToCheck,
  // );
  // const { data: latestCommitBatch } = await octokit.rest.pulls.listCommits({
  //   owner,
  //   repo,
  //   pull_number: pullRequestNumber,
  //   page: lastCommitPage,
  //   per_page: numberOfCommitsToCheck,
  // });
  // let commits = [...latestCommitBatch];
  // if (
  //   numberOfTotalCommits % numberOfCommitsToCheck !== 0 &&
  //   lastCommitPage > 1
  // ) {
  //   // Also fetch previous 10 commits
  //   const { data: previousCommitBatch } = await octokit.rest.pulls.listCommits({
  //     owner,
  //     repo,
  //     pull_number: pullRequestNumber,
  //     page: lastCommitPage - 1,
  //     per_page: numberOfCommitsToCheck,
  //   });
  //   commits = [...previousCommitBatch, ...commits];
  // }

  // // Relevant hashes include both merge from main commits and the last non-merge from main commit
  // const relevantCommitHashes: string[] = [];
  // for (const commit of commits.reverse()) {
  //   const commitMessage = commit.commit.message;
  //   relevantCommitHashes.push(commit.sha);
  //   if (!commitMessage.includes(mergeFromMainCommitMessagePrefix)) {
  //     break;
  //   }
  // }

  // if (triggerAction === PullRequestTriggerType.Labeled) {
  //   // A Bitrise build was triggered for the last commit
  //   bitriseCommentCommitHash = relevantCommitHashes[0];
  //   bitriseCommentBody = bitrisePendingTag;
  // }

  // // Check if Bitrise comment hash matches any of the relevant commit hashes
  // if (relevantCommitHashes.includes(bitriseCommentCommitHash)) {
  //   // Check Bitrise build status from comment
  //   const bitriseCommentPrefix = `Bitrise build status comment for commit ${bitriseCommentCommitHash}`;
  //   if (bitriseCommentBody.includes(bitrisePendingTag)) {
  //     core.setFailed(`${bitriseCommentPrefix} is pending.`);
  //     process.exit(1);
  //   } else if (bitriseCommentBody.includes(bitriseFailTag)) {
  //     core.setFailed(`${bitriseCommentPrefix} has failed.`);
  //     process.exit(1);
  //   } else if (bitriseCommentBody.includes(bitriseSuccessTag)) {
  //     console.log(`${bitriseCommentPrefix} has passed.`);
  //     return;
  //   } else {
  //     core.setFailed(
  //       `${bitriseCommentPrefix} does not contain any build status. Please verify that the build status tag exists in the comment body.`,
  //     );
  //     process.exit(1);
  //   }
  // } else {
  //   // No build comment found for relevant commits
  //   core.setFailed(
  //     `No Bitrise build comment exists for latest commits. ${removeAndApplyInstructions}`,
  //   );
  //   process.exit(1);
  // }
}
