import { GitHub } from '@actions/github/lib/utils';

import { LabelableType, Labelable } from './labelable';

export type PullRequestFile = {
  filename: string;
  additions: number;
  deletions: number;
};

// This function retrieves a pull request on a specific repo
export async function retrievePullRequest(
  octokit: InstanceType<typeof GitHub>,
  repoOwner: string,
  repoName: string,
  prNumber: number,
): Promise<Labelable> {
  const retrievePullRequestQuery = `
    query RetrievePullRequestLabels($repoOwner: String!, $repoName: String!, $prNumber: Int!) {
      repository(owner: $repoOwner, name: $repoName) {
        pullRequest(number: $prNumber) {
          id
          createdAt
          body
          author {
            login
          }
          labels(first: 100) {
            nodes {
                id
                name
            }
          }
        }
      }
    }
  `;

  const retrievePullRequestResult: {
    repository: {
      pullRequest: {
        id: string;
        createdAt: string;
        body: string;
        author: {
          login: string;
        };
        labels: {
          nodes: {
            id: string;
            name: string;
          }[];
        };
      };
    };
  } = await octokit.graphql(retrievePullRequestQuery, {
    repoOwner,
    repoName,
    prNumber,
  });

  const pullRequest: Labelable = {
    id: retrievePullRequestResult?.repository?.pullRequest?.id,
    type: LabelableType.PullRequest,
    number: prNumber,
    repoOwner: repoOwner,
    repoName: repoName,
    createdAt: retrievePullRequestResult?.repository?.pullRequest?.createdAt,
    body: retrievePullRequestResult?.repository?.pullRequest?.body,
    author: retrievePullRequestResult?.repository?.pullRequest?.author?.login,
    labels: retrievePullRequestResult?.repository?.pullRequest?.labels?.nodes,
  };

  return pullRequest;
}

// This function retrieves all files changed in a pull request with their change statistics
export async function retrievePullRequestFiles(
  octokit: InstanceType<typeof GitHub>,
  repoOwner: string,
  repoName: string,
  prNumber: number,
): Promise<PullRequestFile[]> {
  const files: PullRequestFile[] = [];
  let page = 1;
  const perPage = 100;
  let hasMorePages = true;

  while (hasMorePages) {
    const response = await octokit.rest.pulls.listFiles({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber,
      per_page: perPage,
      page,
    });

    files.push(
      ...response.data.map((file) => ({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
      })),
    );

    hasMorePages = response.data.length === perPage;
    page++;
  }

  return files;
}
