#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

// Environment variables from Bitrise
const GITHUB_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const PR_NUMBER = process.env.GITHUB_PR_NUMBER;
const COMMIT_HASH = process.env.GITHUB_PR_HASH;
const BUILD_STATUS = process.env.BITRISE_BUILD_STATUS; // 0 = success, 1 = failure
const PIPELINE_TITLE = process.env.BITRISEIO_PIPELINE_TITLE;
const PIPELINE_BUILD_URL = process.env.BITRISEIO_PIPELINE_BUILD_URL;
const TRIGGERED_BY_PR_LABEL = process.env.TRIGGERED_BY_PR_LABEL;

// Map pipeline titles to pipeline IDs for comment identification
const PIPELINE_ID_MAP = {
  'pr_smoke_e2e_pipeline': 'pr_smoke_e2e_pipeline',
  'pr_regression_e2e_pipeline': 'pr_regression_e2e_pipeline',
  'flask_smoke_e2e_pipeline': 'flask_smoke_e2e_pipeline'
};

async function main() {
  // Only run for PR-triggered builds
  if (TRIGGERED_BY_PR_LABEL !== 'true') {
    console.log('Not triggered by PR label, skipping comment update');
    return;
  }

  if (!GITHUB_TOKEN || !PR_NUMBER || !COMMIT_HASH || !PIPELINE_TITLE) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  // Determine pipeline ID from title
  const pipelineId = PIPELINE_ID_MAP[PIPELINE_TITLE] || PIPELINE_TITLE;
  console.log(`Updating comment for pipeline: ${pipelineId}`);

  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const [owner, repo] = ['MetaMask', 'metamask-mobile'];

  try {
    // Get all comments on the PR
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: parseInt(PR_NUMBER),
      per_page: 100,
    });

    // Find the specific pipeline comment using pipeline-specific tags
    const pipelineTag = `<!-- BITRISE_TAG_${pipelineId} -->`;
    const commitTag = `<!-- ${COMMIT_HASH}-${pipelineId} -->`;
    
    console.log(`Looking for comment with tag: ${pipelineTag}`);
    console.log(`Looking for commit tag: ${commitTag}`);

    const pipelineComment = comments.find(comment => 
      comment.body && 
      comment.body.includes(pipelineTag) && 
      comment.body.includes(commitTag)
    );

    if (!pipelineComment) {
      console.log(`No existing comment found for pipeline ${pipelineId} and commit ${COMMIT_HASH}`);
      return;
    }

    console.log(`Found comment to update: ${pipelineComment.id}`);

    // Determine status based on build result
    const isSuccess = BUILD_STATUS === '0';
    const statusEmoji = isSuccess ? '✅✅✅' : '❌❌❌';
    const statusText = isSuccess ? 'passed' : 'failed';
    const statusTag = isSuccess ? 
      `<!-- BITRISE_SUCCESS_TAG_${pipelineId} -->` : 
      `<!-- BITRISE_FAIL_TAG_${pipelineId} -->`;

    // Generate short commit hash for display
    const shortCommitHash = COMMIT_HASH.substring(0, 8);
    const commitLink = `https://github.com/${owner}/${repo}/commit/${COMMIT_HASH}`;

    // Determine the appropriate label for re-triggering based on pipeline
    let triggerLabel = 'Run Smoke E2E';
    if (pipelineId === 'pr_regression_e2e_pipeline') {
      triggerLabel = 'Run Regression E2E';
    } else if (pipelineId === 'flask_smoke_e2e_pipeline') {
      triggerLabel = 'Run Flask Smoke E2E';
    }

    // Create updated comment body
    const updatedBody = `## [<img alt="https://bitrise.io/" src="https://assets-global.website-files.com/5db35de024bb983af1b4e151/5e6f9ccc3e129dfd8a205e4e_Bitrise%20Logo%20-%20Eggplant%20Bg.png" height="20">](${PIPELINE_BUILD_URL}) **Bitrise**

${statusEmoji} \`${pipelineId}\` ${statusText} on Bitrise! ${statusEmoji}

Commit hash: [${shortCommitHash}](${commitLink})
Build link: ${PIPELINE_BUILD_URL}

>[!NOTE]
>- Build completed for pipeline \`${pipelineId}\`
>- You can kick off another \`${pipelineId}\` on Bitrise by removing and re-applying the \`${triggerLabel}\` label on the pull request
${pipelineTag}
${statusTag}

${commitTag}`;

    // Update the comment
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: pipelineComment.id,
      body: updatedBody,
    });

    console.log(`Successfully updated comment for pipeline ${pipelineId} with ${statusText} status`);

  } catch (error) {
    console.error('Error updating comment:', error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});