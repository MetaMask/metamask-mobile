import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
  CompletedConclusionType,
  PullRequestTriggerType,
  StatusCheckStatusType,
} from '../scripts.types';
import axios from 'axios';

let octokitInstance: InstanceType<typeof GitHub> | null = null;
let owner: string;
let repo: string;

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});



function getOctokitInstance(): InstanceType<typeof GitHub> {
  if (!octokitInstance) {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error("GitHub token is not set in the environment variables");
    }
    octokitInstance = getOctokit(githubToken);
  }
  return octokitInstance;
}

async function upsertStatusCheck(
  statusCheckName: string,
  commitHash: string,
  status: StatusCheckStatusType, 
  conclusion: CompletedConclusionType | undefined, 
  summary: string
): Promise<void> {
  const octokit = getOctokitInstance();

  // List existing checks
  const listResponse = await octokit.rest.checks.listForRef({
    owner,
    repo,
    ref: commitHash,
  });

  if (listResponse.status !== 200) {
    core.setFailed(
      `Failed to list checks for commit ${commitHash}, received status code ${listResponse.status}`,
    );
    process.exit(1);
  }

  const existingCheck = listResponse.data.check_runs.find(check => check.name === statusCheckName);

  if (existingCheck) {
    console.log(`Check already exists: ${existingCheck.name}, updating...`);
    // Update the existing check
    const updateCheckResponse = await octokit.rest.checks.update({
      owner,
      repo,
      check_run_id: existingCheck.id,
      name: statusCheckName,
      status: status,
      conclusion: conclusion,
      output: {
        title: `${statusCheckName} Status Check`,
        summary: summary,
      },
    });

    if (updateCheckResponse.status !== 200) {
      core.setFailed(
        `Failed to update '${statusCheckName}' check with status ${status} for commit ${commitHash}, got status code ${updateCheckResponse.status}`,
      );
      process.exit(1);
    }

    console.log(`Updated existing check: ${statusCheckName} with id ${existingCheck.id} & status ${status} for commit ${commitHash}`);

    

  } else {
    console.log(`Check does not exist: ${statusCheckName}, creating...`);
    // Create a new status check
    const createCheckResponse = await octokit.rest.checks.create({
      owner,
      repo,
      name: statusCheckName,
      head_sha: commitHash,
      status: status,
      conclusion: conclusion,
      started_at: new Date().toISOString(),
      output: {
        title: `${statusCheckName} Status Check`,
        summary: summary,
      },
    });

    if (createCheckResponse.status !== 201) {
      core.setFailed(
        `Failed to create '${statusCheckName}' check with status ${status} for commit ${commitHash}, got status code ${createCheckResponse.status}`,
      );
      process.exit(1);
    }

    console.log(`Created check: ${statusCheckName} with id ${createCheckResponse.data.id} & status ${status} for commit ${commitHash}`);
  }
}
// Determine whether E2E should run and provide the associated reason
function shouldRunBitriseE2E(antiLabel: boolean, hasSmokeTestLabel: boolean, isDocs: boolean, isFork: boolean, isMergeQueue: boolean): [boolean, string] {

  const conditions = [
    {condition: hasSmokeTestLabel, message: "The smoke test label is present.", shouldRun: true},
    {condition: isFork, message: "The pull request is from a fork.", shouldRun: false},
    {condition: isDocs, message: "The pull request is documentation related.", shouldRun: false},
    {condition: isMergeQueue, message: "The pull request is part of a merge queue.", shouldRun: false},
    {condition: antiLabel, message: "The pull request has the anti-label.", shouldRun: false}
  ];

  // Iterate through conditions to determine action
  for (const {condition, message, shouldRun} of conditions) {
    if (condition) {
      return [shouldRun, message];
    }
  }

  // Default case if no conditions met
  return [false, "Unexpected scenario or no relevant labels found."];
}


async function main(): Promise<void> {
  const githubToken = process.env.GITHUB_TOKEN;
  const e2eLabel = process.env.E2E_LABEL;
  const antiLabel = process.env.NO_E2E_LABEL;
  const e2ePipeline = process.env.E2E_PIPELINE;
  const workflowName = process.env.WORKFLOW_NAME;
  const triggerAction = context.payload.action as PullRequestTriggerType;
  // Assuming context.issue comes populated with owner and repo, as typical with GitHub Actions
  const { owner: contextOwner, repo: contextRepo, number: pullRequestNumber } = context.issue;
  owner = contextOwner;
  repo = contextRepo;
  
  const removeAndApplyInstructions = `Remove and re-apply the "${e2eLabel}" label to trigger a E2E smoke test on Bitrise.`;
  const mergeFromMainCommitMessagePrefix = `Merge branch 'main' into`;
  const pullRequestLink = `https://github.com/MetaMask/metamask-mobile/pull/${pullRequestNumber}`;
  const statusCheckName = 'Bitrise E2E Status';
  const statusCheckTitle = 'Bitrise E2E Smoke Test Run';

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';

  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found');
    process.exit(1);
  }

  if (!e2eLabel) {
    core.setFailed('E2E_LABEL not found');
    process.exit(1);
  }

  if (!antiLabel) {
    core.setFailed('NO_E2E_LABEL not found');
    process.exit(1);
  }

  // Logging for Pipeline debugging
  console.log(`Trigger action: ${triggerAction}`);
  console.log(`event: ${context.eventName}`);
  console.log(`pullRequestNumber: ${pullRequestNumber}`);

  const mergeQueue = (context.eventName === 'merge_group')
  const mqCommitHash = context.payload?.merge_group?.head_sha;


  const octokit = getOctokitInstance();

  const { data: prData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });

  // Get the latest commit hash
  const prCommitHash = prData?.head?.sha;
  // Determine the latest commit hash depending if it's a PR or MQ
  const latestCommitHash = mergeQueue ? mqCommitHash : prCommitHash;

  // Grab flags & labels
  const labels = prData?.labels ?? [];
  const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);
  const hasAntiLabel = labels.some((label) => label.name === antiLabel);
  const fork = context.payload.pull_request?.head.repo.fork || false;
  const docs = mergeQueue ? false : prData.title.startsWith("docs:");


  console.log(`Docs: ${docs}`);
  console.log(`Fork: ${fork}`);
  console.log(`Merge Queue: ${mergeQueue}`);
  console.log(`Has smoke test label: ${hasSmokeTestLabel}`);
  console.log(`Anti label: ${hasAntiLabel}`);

  const [shouldRun, reason] = shouldRunBitriseE2E(hasAntiLabel, hasSmokeTestLabel, docs, fork, mergeQueue);
  console.log(`Should run: ${shouldRun}, Reason: ${reason}`);

  // One of these two labels must exist for pull_request type
  if (!mergeQueue && !hasSmokeTestLabel && !hasAntiLabel) {

    // Fail Status due to missing labels
    await upsertStatusCheck(statusCheckName, latestCommitHash, StatusCheckStatusType.Completed, 
      CompletedConclusionType.Failure, `Failed due to missing labels. Please apply either ${e2eLabel} or ${antiLabel}.`);
    return
  }

  if (!shouldRun) {
    console.log(
      `Skipping Bitrise status check. due to the following reason: ${reason}`,
    );

    await upsertStatusCheck(statusCheckName, latestCommitHash, StatusCheckStatusType.Completed, CompletedConclusionType.Success,
      `Skip run since ${reason}`);
    return;
  }

  // Kick off E2E smoke tests if E2E smoke label is applied
  if (
    triggerAction === PullRequestTriggerType.Labeled &&
    context.payload?.label?.name === e2eLabel
  ) {

    console.log(`Starting Bitrise build for commit ${latestCommitHash}`);
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

    if (!bitriseBuildResponse.data.build_slug) {
      core.setFailed(`Bitrise build slug not found`);
      process.exit(1);
    }

    const latestCommitTag = `<!-- ${latestCommitHash} -->`;
    const buildLink = `${bitriseProjectUrl}/pipelines/${bitriseBuildResponse.data.build_slug}`;
    const message = `## [<img alt="https://bitrise.io/" src="https://assets-global.website-files.com/5db35de024bb983af1b4e151/5e6f9ccc3e129dfd8a205e4e_Bitrise%20Logo%20-%20Eggplant%20Bg.png" height="20">](${buildLink}) **Bitrise**\n\n🔄🔄🔄 \`${e2ePipeline}\` started on Bitrise...🔄🔄🔄\n\nCommit hash: ${latestCommitHash}\nBuild link: ${buildLink}\n\n>[!NOTE]\n>- This comment will auto-update when build completes\n>- You can kick off another \`${e2ePipeline}\` on Bitrise by removing and re-applying the \`${e2eLabel}\` label on the pull request\n${bitriseTag}\n${bitrisePendingTag}\n\n${latestCommitTag}`;

    if (bitriseBuildResponse.status === 201) {
      console.log(
        `Started Bitrise build for commit ${latestCommitHash} at ${buildLink}`,
      );
    } else {
      core.setFailed(
        `Bitrise build request returned with status code ${bitriseBuildResponse.status}`,
      );
      process.exit(1);
    }

    // Look for existing Bitrise comment.
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pullRequestNumber,
    });

    // Check for existing Bitrise comment with commit tag.
    const bitriseComment = comments.find(({ body }) =>
      body?.includes(latestCommitTag),
    );

    // Reopen conversation in case it's locked
    const unlockConvoResponse = await octokit.rest.issues.unlock({
      owner,
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

    if (bitriseComment) {
      // Existing comment exists for commit hash. Update comment with pending status.
      const updateCommentResponse = await octokit.rest.issues.updateComment({
        owner,
        repo,
        issue_number: pullRequestNumber,
        body: message,
        comment_id: bitriseComment.id,
      });

      if (updateCommentResponse.status === 200) {
        console.log(`Updating comment in pull request ${pullRequestLink}`);
      } else {
        core.setFailed(
          `Update comment request returned with status code ${updateCommentResponse.status}`,
        );
        process.exit(1);
      }
    } else {
      // Post new Bitrise pending comment in PR.
      const postCommentResponse = await octokit.rest.issues.createComment({
        owner,
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

    // Post pending status
    console.log(`Posting pending status for commit ${latestCommitHash}`);
    
    await upsertStatusCheck( statusCheckName, latestCommitHash, StatusCheckStatusType.InProgress, undefined, `Test runs in progress... You can view them at ${buildLink}`);


    return;
  }

  // Code below updates Bitrise status check by comparing the latest Bitrise comment against the latest commits

  // Get at least the last 30 comments
  const numberOfTotalComments = prData.comments;
  const numberOfCommentsToCheck = 30;
  const lastCommentPage = Math.ceil(
    numberOfTotalComments / numberOfCommentsToCheck,
  );


  const { data: latestCommentBatch } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: pullRequestNumber,
    page: lastCommentPage,
    per_page: numberOfCommentsToCheck,
  });
  let comments = [...latestCommentBatch];
  if (
    numberOfTotalComments % numberOfCommentsToCheck !== 0 &&
    lastCommentPage > 1
  ) {
    // Last page's comments will be less than 30, fetch second last page as well to ensure there is at least 30 comments.
    const { data: previousCommentBatch } =
      await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullRequestNumber,
        page: lastCommentPage - 1,
        per_page: numberOfCommentsToCheck,
      });
    comments = [...previousCommentBatch, ...comments];
  }

  // Get latest Bitrise comment
  const bitriseComment = comments
    .reverse()
    .find(({ body }) => body?.includes(bitriseTag));

  // Bitrise comment doesn't exist, post fail status
  if (!bitriseComment) {

    console.log(`Bitrise comment not detected for commit ${latestCommitHash}`);

    await upsertStatusCheck(statusCheckName, latestCommitHash, StatusCheckStatusType.Completed,
       CompletedConclusionType.Failure, 
       `No Bitrise comment found for commit ${latestCommitHash}. Try re-applying the '${e2eLabel}' label.`);

    return;
  }

  // Bitrise comment does exist, update status check based on Bitrise comment status
  // This regex matches a 40-character hexadecimal string enclosed within <!-- and -->
  let bitriseCommentBody = bitriseComment.body || '';
  const commitTagRegex = /<!--\s*([0-9a-f]{40})\s*-->/i;
  const hashMatch = bitriseCommentBody.match(commitTagRegex);
  let bitriseCommentCommitHash = hashMatch && hashMatch[1] ? hashMatch[1] : '';

  // Get at least the last 10 commits
  const numberOfTotalCommits = prData.commits;
  const numberOfCommitsToCheck = 10;
  const lastCommitPage = Math.ceil(
    numberOfTotalCommits / numberOfCommitsToCheck,
  );
  const { data: latestCommitBatch } = await octokit.rest.pulls.listCommits({
    owner,
    repo,
    pull_number: pullRequestNumber,
    page: lastCommitPage,
    per_page: numberOfCommitsToCheck,
  });
  let commits = [...latestCommitBatch];
  if (
    numberOfTotalCommits % numberOfCommitsToCheck !== 0 &&
    lastCommitPage > 1
  ) {
    // Last page's commits will be less than 10, fetch second last page as well to ensure there is at least 10 commits.
    const { data: previousCommitBatch } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequestNumber,
      page: lastCommitPage - 1,
      per_page: numberOfCommitsToCheck,
    });
    commits = [...previousCommitBatch, ...commits];
  }

  // Relevant hashes include both merge from main commits and the last non-merge from main commit (the commits that you manually push)
  const relevantCommitHashes: string[] = [];
  for (const commit of commits.reverse()) {
    const commitMessage = commit.commit.message;
    relevantCommitHashes.push(commit.sha);
    if (!commitMessage.includes(mergeFromMainCommitMessagePrefix)) {
      break;
    }
  }

  let checkStatus: {
    status: StatusCheckStatusType;
    conclusion?: CompletedConclusionType;
  } = {
    status: StatusCheckStatusType.Completed,
  };
  let statusMessage = '';

  // Check if Bitrise comment hash matches any of the relevant commit hashes
  if (relevantCommitHashes.includes(bitriseCommentCommitHash)) {
    // Check Bitrise build status from comment
    const bitriseCommentPrefix = `Bitrise build status comment for commit ${bitriseCommentCommitHash}`;
    if (bitriseCommentBody.includes(bitrisePendingTag)) {
      checkStatus.status = StatusCheckStatusType.InProgress;
      statusMessage = `${bitriseCommentPrefix} is pending.`;
    } else if (bitriseCommentBody.includes(bitriseFailTag)) {
      checkStatus = {
        status: StatusCheckStatusType.Completed,
        conclusion: CompletedConclusionType.Failure,
      };
      statusMessage = `${bitriseCommentPrefix} has failed.`;
    } else if (bitriseCommentBody.includes(bitriseSuccessTag)) {
      checkStatus.conclusion = CompletedConclusionType.Success;
      statusMessage = `${bitriseCommentPrefix} has passed.`;
    } else {
      checkStatus = {
        status: StatusCheckStatusType.Completed,
        conclusion: CompletedConclusionType.Failure,
      };
      statusMessage = `${bitriseCommentPrefix} does not contain any build status. Please verify that the build status tag exists in the comment body.`;
    }
  } else {
    // No build comment found for relevant commits
    checkStatus = {
      status: StatusCheckStatusType.Completed,
      conclusion: CompletedConclusionType.Failure,
    };
    statusMessage = `No Bitrise build comment exists for latest commits. ${removeAndApplyInstructions}`;
  }

  // Post status check
  await upsertStatusCheck(statusCheckName, latestCommitHash, checkStatus.status, checkStatus.conclusion, statusMessage);

}
