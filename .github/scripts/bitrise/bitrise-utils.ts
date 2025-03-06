import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';


let octokitInstance: InstanceType<typeof GitHub> | null = null;

// Define an interface for the commit data returned by GitHub
interface Commit {
  sha: string;
  commit: {
    message: string;
  };
}

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
  commitSha: string;
  body?: string;
  body_text?: string;
  body_html?: string;
  html_url: string;
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

export async function getLatestAssociatedBitriseComment(commitHashes: string[]): Promise<GithubComment | undefined> {

  // Get all Bitrise comments
  const comments = await getAllBitriseComments();

  // Log all the comments and their commit sha
  comments.forEach((comment) => {
    console.log(`Found Bitrise comment for commit: ${comment.commitSha}`);
  });

  console.log(`Checking if recent commits have Bitrise comments: ${commitHashes}`);

  // Iterate through each commit hash to find the first matching Bitrise comment
  // Return the first matching comment as our commits are sorted by newest to oldest
  for (let i = 0; i < commitHashes.length; i++) {
    const foundComment = comments.find(comment => comment.commitSha === commitHashes[i]);
    if (foundComment) {
      return foundComment;
    }
  }

  return undefined
}

export async function getBitriseTestStatus(bitriseComment: GithubComment): Promise<BitriseTestStatus> {

  if (!bitriseComment) {
    return BitriseTestStatus.NotFound;
  }

  if (bitriseComment.body?.includes(bitriseSuccessTag)) {
    return BitriseTestStatus.Success;
  }

  if (bitriseComment.body?.includes(bitrisePendingTag)) {
    return BitriseTestStatus.Pending;
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

  // Look for existing Bitrise comments, requesting 30 comments per page, sorted by creation date in descending order
  const { data: comments } = await getOctokitInstance().rest.issues.listComments({
    owner,
    repo,
    issue_number: pullRequestNumber,
    per_page: 30, // Set the number of comments to fetch per page
    sort: 'created', // Sort by creation time
    direction: 'desc' // Sort in descending order to have the newest comments first
  });
  // Filter comments to find those containing Bitrise tags
  const bitriseComments = comments.filter(({ body }: { body?: string }) => body?.includes(bitriseTag));

  // Set the commit sha for each comment
  const modifiedComments = bitriseComments.map((comment: any) => {
    const commitSha = comment.body?.match(/<!-- ([a-f0-9]{40}) -->/)?.[1];
    return {
      ...comment,
      commitSha: commitSha || ""
    };
  });

  return modifiedComments

}

export async function getBitriseCommentForCommit(commitHash: string): Promise<GithubComment | undefined> {

  const commitTag = `<!-- ${commitHash} -->`;
  const comments = await getAllBitriseComments();

  // Check for existing Bitrise comment with commit tag.
  const bitriseComment = comments.find(({ body }) => body?.includes(commitTag));

  // Return the found comment or undefined if not found
  return bitriseComment;
}

export async function getRecentCommits(): Promise<string[]> {
  const mergeFromMainCommitMessagePrefix = `Merge branch 'main' into`;
  const { owner, repo, number: pullRequestNumber } = context.issue;

  let allCommits: Commit[] = [];
  let page = 1;
  let hasMore = true;

  // Loop through all pages of commits
  while (hasMore) {
    const { data: commits } = await getOctokitInstance().rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequestNumber,
      per_page: 100, // Fetch 100 commits per page
      page
    });

    allCommits = allCommits.concat(commits);
    hasMore = commits.length === 100; // Continue if we got 100 commits, as there might be more
    page++;
  }

  // Filter out merge commits from main
  const filteredCommits = allCommits.filter(commit => !commit.commit.message.startsWith(mergeFromMainCommitMessagePrefix));

  // Map the data to extract commit SHAs
  const shas = filteredCommits.map(commit => commit.sha);
  return shas.reverse().slice(0, 10); // Return the last 10 commits
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
    {condition: flags.hasSmokeTestLabel, message: "The smoke test label is present.", shouldRun: true},
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