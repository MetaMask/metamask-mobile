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
  const commitHash = context.sha;
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
          mapped_to: 'TRIGGERED_BY_LABEL',
          value: `true`,
          is_expand: true,
        },
        {
          mapped_to: 'GITHUB_PR_HASH',
          value: `${commitHash}`,
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

  if (!bitriseBuildResponse.data.build_slug) {
    core.setFailed(`Bitrise build slug not found`);
    process.exit(1);
  }

  const buildLink = `${bitriseProjectUrl}/pipelines/${bitriseBuildResponse.data.build_slug}`;
  const message = `## [<img alt="https://bitrise.io/" src="https://assets-global.website-files.com/5db35de024bb983af1b4e151/5e6f9ccc3e129dfd8a205e4e_Bitrise%20Logo%20-%20Eggplant%20Bg.png" height="20">](https://app.bitrise.io/app/be69d4368ee7e86d/pipelines/8351b42f-c87f-496e-a4a4-387e248037ea) **Bitrise**\n\n🔄🔄🔄 \`${e2ePipeline}\` pipeline started on Bitrise...\n\nCommit hash: ${commitHash}\nBuild link: ${buildLink}\n\n>[!NOTE]\n>- This comment will auto-update when build succeeds\n>- You can kick off another \`${e2ePipeline}\` build on Bitrise by removing and re-applying the \`Run Smoke E2E\` label on the pull request\n\n<!-- ${commitHash} -->`;

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
