import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';


let octokitInstance: InstanceType<typeof GitHub> | null = null;

export enum BitriseTestStatus {
  Pending,
  Success,
  Failure,
  NotFound
}

interface Label {
  name: string;
}


export interface E2ERunFlags {
    isFork : boolean;
    isDocs : boolean;
    isMQ : boolean;
    hasAntiLabel : boolean;
    hasSmokeTestLabel : boolean;
}

export interface GithubComment {
  id: number;
  node_id: string;
  url: string;
  body?: string;
  body_text?: string;
  body_html?: string;
  html_url: string;
}

export async function getBitriseTestStatus(commitHash: string): Promise<BitriseTestStatus> {
  const bitriseComment = await getBitriseCommentForCommit(commitHash);

  if (!bitriseComment) {
    return BitriseTestStatus.NotFound;
  }

  if (bitriseComment.body?.includes(bitriseSuccessTag)) {
    return BitriseTestStatus.Success;
  }

  if (bitriseComment.body?.includes(bitriseFailTag)) {
    return BitriseTestStatus.Failure;
  }

  return BitriseTestStatus.Pending;
}

export async function determineE2ERunFlags(): Promise<E2ERunFlags> {

  const { owner: owner, repo: repo, number: pullRequestNumber } = context.issue;

  const octokit = getOctokitInstance();
  const { data: prData } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });


  const e2eLabel = process.env.E2E_LABEL;
  const antiLabel = process.env.NO_E2E_LABEL;

    // Grab flags & labels
    const labels: Label[] = prData?.labels ?? [];
    const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);
    const hasAntiLabel = labels.some((label) => label.name === antiLabel);
    const fork = context.payload.pull_request?.head.repo.fork || false;
    const docs = isMergeQueue() ? false : prData.title.startsWith("docs:");

    return {
        isFork: fork,
        isDocs: docs,
        isMQ: isMergeQueue(),
        hasAntiLabel: hasAntiLabel,
        hasSmokeTestLabel: hasSmokeTestLabel
    }

}


export function isMergeQueue() {
  return context.eventName === 'merge_group';
}

export function getMergeQueueCommitHash() : string {
  return context.payload?.merge_group?.head_sha;
}

export async function getAllBitriseComments(): Promise<GithubComment[]> {

  const { owner, repo, number: pullRequestNumber } = context.issue;

    // Look for existing Bitrise comment.
    const { data: comments } = await getOctokitInstance().rest.issues.listComments({
      owner,
      repo,
      issue_number: pullRequestNumber,
  });

  // Filter comments to find those containing Bitrise tags
  const bitriseComments = comments.filter(({ body }) => {
    return body?.includes(bitriseTag);
  });

  return bitriseComments

}

export async function getBitriseCommentForCommit(commitHash: string): Promise<GithubComment | undefined> {

  const commitTag = `<!-- ${commitHash} -->`;
  const comments = await getAllBitriseComments();

  // Check for existing Bitrise comment with commit tag.
  const bitriseComment = comments.find(({ body }) => body?.includes(commitTag));

  // Return the found comment or undefined if not found
  return bitriseComment;
}

export async function getCommitHash() {

  const { owner: owner, repo: repo, number: pullRequestNumber } = context.issue;

  const { data: prData } = await getOctokitInstance().rest.pulls.get({
    owner,
    repo,
    pull_number: pullRequestNumber,
  });

  // Get the latest commit hash
  const prCommitHash = prData?.head?.sha;
  // Determine the latest commit hash depending if it's a PR or MQ
  const latestCommitHash = isMergeQueue() ? getMergeQueueCommitHash() : prCommitHash;

  return latestCommitHash;
}

export function getOctokitInstance(): InstanceType<typeof GitHub> {
    if (!octokitInstance) {
      const githubToken = process.env.GITHUB_TOKEN;
      if (!githubToken) {
        throw new Error("GitHub token is not set in the environment variables");
      }
      octokitInstance = getOctokit(githubToken);
    }
    return octokitInstance;
  }
  
// Determine whether E2E should run and provide the associated reason
export function shouldRunBitriseE2E(flags : E2ERunFlags): [boolean, string] {

  const conditions = [
    {condition: flags.hasAntiLabel, message: "The smoke test label is present.", shouldRun: true},
    {condition: flags.isFork, message: "The pull request is from a fork.", shouldRun: false},
    {condition: flags.isDocs, message: "The pull request is documentation related.", shouldRun: false},
    {condition: flags.isMQ, message: "The pull request is part of a merge queue.", shouldRun: false},
    {condition: flags.hasAntiLabel, message: "The pull request has the anti-label.", shouldRun: false}
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