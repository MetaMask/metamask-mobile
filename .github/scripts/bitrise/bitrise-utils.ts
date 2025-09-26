import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

  // Define Bitrise comment tags
  const bitriseTag = '<!-- BITRISE_TAG -->';
  const bitrisePendingTag = '<!-- BITRISE_PENDING_TAG -->';
  const bitriseSuccessTag = '<!-- BITRISE_SUCCESS_TAG -->';
  const bitriseFailTag = '<!-- BITRISE_FAIL_TAG -->';


let octokitInstance: InstanceType<typeof GitHub> | null = null;


interface Label {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description: string | null;
}

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
  user?: {
    name?: string | null;
  } | null;
  reactions?: {
  };
}

export interface InternalGithubComment {
  id: number;
  node_id: string;
  url: string;
  body?: string;
  body_text?: string;
  body_html?: string;
  html_url: string;
  user?: {
    name?: string | null;
  } | null;
  reactions?: {
  };
}



export function printTime () {
  const date = new Date();
  console.log(date.toTimeString());
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

export async function removeLabel(label: string) {

  const { owner: owner, repo: repo, number: pullRequestNumber } = context.issue;

  try {
    // Get all labels for the issue (PR is considered an issue in terms of the API)
    const { data: labels } = await getOctokitInstance().rest.issues.listLabelsOnIssue({
      owner,
      repo,
      issue_number: pullRequestNumber
    });

    // Check if the label exists
    if (labels.find((l: Label) => l.name === label))  {
      // Remove the label
      await getOctokitInstance().rest.issues.removeLabel({
        owner,
        repo,
        issue_number: pullRequestNumber,
        name: label
      });
      console.log(`Label '${label}' removed successfully.`);
    } else {
      console.log(`Label '${label}' does not exist on issue #${pullRequestNumber}.`);
    }
  } catch (error) {
    console.error('Error removing label:', error);
  }
}

export function isMergeFromMainBranch(commitMessage: string): boolean {
  const mergeFromMainCommitMessagePrefix = `Merge branch 'main' into`;
  return commitMessage.startsWith(mergeFromMainCommitMessagePrefix);
}

export async function getLatestAssociatedBitriseComment(commitHashes: string[]): Promise<GithubComment | undefined> {

  // Get all Bitrise comments
  const comments = await getAllBitriseComments();

  // Log all the comments and their commit sha
  comments.forEach((comment) => {
    console.log(`Found Bitrise comment for commit: ${comment.commitSha}`);
  });

  console.log(`Checking if recent commits have Bitrise comments: ${commitHashes}`);

  // Check if the latest commit has a Bitrise comment
  if (commitHashes.length > 0) {
    const latestCommit = commitHashes[0];
    const latestCommitComment = comments.find(comment => comment.commitSha === latestCommit);
    
    if (latestCommitComment) {
      console.log(`Found Bitrise comment for latest commit: ${latestCommit}`);
      return latestCommitComment;
    }
    
    // If we're here, the latest commit doesn't have a Bitrise comment
    // Get commit messages to check if they're merge commits
    const { owner, repo, number: pullRequestNumber } = context.issue;
    const { data: commits } = await getOctokitInstance().rest.pulls.listCommits({
      owner,
      repo,
      pull_number: pullRequestNumber
    });
    
    // Create a map of commit SHA to commit message
    const commitMessages = new Map<string, string>();
    commits.forEach(commit => {
      commitMessages.set(commit.sha, commit.commit.message);
    });
    
    // Check older commits, but only consider those that are merge commits from main
    for (let i = 1; i < commitHashes.length; i++) {
      const commitHash = commitHashes[i];
      const commitMessage = commitMessages.get(commitHash) || '';
      
      // Only consider this commit if it's a merge from main
      if (isMergeFromMainBranch(commitMessage)) {
        const foundComment = comments.find(comment => comment.commitSha === commitHash);
        if (foundComment) {
          console.log(`Found Bitrise comment for merge commit: ${commitHash}`);
          return foundComment;
        }
      }
    }
  }

  return undefined;
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

    // Grab flags & labels
    const labels: Label[] = prData?.labels ?? [];
    const hasSmokeTestLabel = labels.some((label) => label.name === e2eLabel);
    const fork = context.payload.pull_request?.head.repo.fork || false;
    const docs = isMergeQueue() ? false : prData.title.startsWith("docs:");

    return {
        isFork: fork,
        isDocs: docs,
        isMQ: isMergeQueue(),
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

  let allComments: InternalGithubComment[] = [];

  let page = 1;

  while (true) {
    const { data: comments, headers } = await getOctokitInstance().rest.issues.listComments({
      owner,
      repo,
      issue_number: pullRequestNumber,
      per_page: 100,
      page: page,
      sort: 'created',
      direction: 'desc'
    });


    // Transform GitHub API comments to GithubComment objects
    const convertedComments = comments.map((comment: InternalGithubComment) => ({
      id: comment.id,
      node_id: comment.node_id,
      url: comment.url,
      body: comment.body,
      body_text: comment.body_text || undefined,
      body_html: comment.body_html || undefined,
      html_url: comment.html_url,
      user: comment.user,  // Retain or handle as needed
    }));

    allComments = allComments.concat(convertedComments);

    if (comments.length < 100 || !headers.link || !headers.link.includes('rel="next"')) {
      break; // No more pages to fetch if fewer than 100 comments are returned or no next link
    }
    page++;
  }

  // Filter and modify comments as before
  const bitriseComments = allComments.filter(({ body }) => body?.includes(bitriseTag));
  const modifiedComments = bitriseComments.map(comment => {
    const commitSha = comment.body?.match(/<!-- ([a-f0-9]{40}) -->/)?.[1];
    return {
      ...comment,
      commitSha: commitSha || ""
    };
  });

  return modifiedComments.reverse().slice(0, 5); // Return the last 5 bitrise comments
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

  // Map the data to extract commit SHAs
  const shas = allCommits.map(commit => commit.sha);
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
