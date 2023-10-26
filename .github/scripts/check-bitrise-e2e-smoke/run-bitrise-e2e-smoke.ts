import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import axios from 'axios';

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  const e2eLabel = process.env.E2E_LABEL;
  const githubToken = process.env.GITHUB_TOKEN;
  const e2ePipeline = process.env.E2E_PIPELINE;
  const workflowName = process.env.WORKFLOW_NAME;
  const pullRequestNumber = context.issue.number;
  const repoOwner = context.repo.owner;
  const repo = context.repo.repo;
  const pullRequestLink = `https://github.com/MetaMask/metamask-mobile/pull/${pullRequestNumber}`;

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!e2ePipeline) {
    core.setFailed('E2E_PIPELINE not found');
    process.exit(1);
  }

  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  const data = {
    hook_info: {
      type: 'bitrise',
      build_trigger_token: process.env.BITRISE_BUILD_TRIGGER_TOKEN,
    },
    build_params: {
      branch: process.env.GITHUB_HEAD_REF,
      pipeline_id: e2ePipeline,
      commit_message: `Triggered by (${workflowName}) workflow in ${pullRequestLink}`,
    },
    triggered_by: workflowName,
  };

  const bitriseProjectUrl = `https://app.bitrise.io/app/${process.env.BITRISE_APP_ID}`;

  // Start Bitrise build.
  const bitriseBuildResponse = await axios.post(
    `${bitriseProjectUrl}/build/start.json`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (!bitriseBuildResponse.data.build_slug) {
    core.setFailed(`Bitrise build slug not found`);
    process.exit(1);
  }

  const buildLink = `${bitriseProjectUrl}/pipelines/${bitriseBuildResponse.data.build_slug}`;
  const message = `E2E test started on Bitrise: ${buildLink}\nYou can also kick off another Bitrise E2E smoke test by removing and re-applying the (${e2eLabel}) label`;

  if (bitriseBuildResponse.status === 201) {
    console.log(message);
  } else {
    core.setFailed(
      `Bitrise build request returned with status code ${bitriseBuildResponse.status}`,
    );
    process.exit(1);
  }

  // Reopen conversation in case it's locked
  const unlockConvoResponse = await octokit.rest.issues.unlock({
    owner: repoOwner,
    repo,
    issue_number: pullRequestNumber,
  });

  if (unlockConvoResponse.status === 204) {
    console.log(`Unlocked conversation for PR ${pullRequestLink}`);
  } else {
    core.setFailed(
      `Unlock conversation request returned with status code ${unlockConvoResponse.status}`,
    );
    process.exit(1);
  }

  // Post build link in PR comments.
  const postCommentResponse = await octokit.rest.issues.createComment({
    owner: repoOwner,
    repo,
    issue_number: pullRequestNumber,
    body: message,
  });

  if (postCommentResponse.status === 201) {
    console.log(`Posting comment in pull request ${pullRequestLink}`);
  } else {
    core.setFailed(
      `Post comment request returned with status code ${postCommentResponse.status}`,
    );
    process.exit(1);
  }
}
