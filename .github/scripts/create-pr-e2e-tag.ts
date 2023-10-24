import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

const E2E_TRIGGERED_LABEL = 'RUN E2E';

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  // "GITHUB_TOKEN" is an automatically generated, repository-specific access token provided by GitHub Actions.
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    core.setFailed('GITHUB_TOKEN not found.');
    process.exit(1);
  }

  // Initialise octokit, required to call Github GraphQL API
  const octokit: InstanceType<typeof GitHub> = getOctokit(githubToken);

  const { pull_request, label, repository } = context.payload;

  if (!pull_request || !label || !repository) {
    core.setFailed('pull_request, label, or repository not found.');
    process.exit(1);
  }

  console.log('LABEL', label);

  if (label.name === E2E_TRIGGERED_LABEL) {
    const tagName = `pr-e2e-${pull_request.number}`;

    const { data: ref } = await octokit.rest.git.getRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `heads/${pull_request.head.ref}`,
    });

    await octokit.rest.git.createRef({
      owner: repository.owner.login,
      repo: repository.name,
      ref: `refs/tags/${tagName}`,
      sha: ref.object.sha,
    });

    console.log(`Created tag ${tagName}.`);
  } else {
    console.log(
      `Skipping E2E build on PR #${pull_request.number} since ${E2E_TRIGGERED_LABEL} label does not exist.`,
    );
  }
}
