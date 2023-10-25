import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';

import { retrieveIssue } from './shared/issue';
import {
  Labelable,
  LabelableType,
  addLabelToLabelable,
  removeLabelFromLabelable,
  removeLabelFromLabelableIfPresent,
} from './shared/labelable';
import {
  Label,
  externalContributorLabel,
  invalidIssueTemplateLabel,
  invalidPullRequestTemplateLabel,
} from './shared/label';
import { TemplateType, templates } from './shared/template';
import { retrievePullRequest } from './shared/pull-request';

main().catch((error: Error): void => {
  console.error(error);
  process.exit(1);
});

async function main(): Promise<void> {
  // "GITHUB_TOKEN" is an automatically generated, repository-specific access token provided by GitHub Actions.
  // We can't use "GITHUB_TOKEN" here, as its permissions don't allow neither to create new labels
  // nor to retrieve the list of organisations a user belongs to.
  // In our case, we may want to create "regression-prod-x.y.z" label when it doesn't already exist.
  // We may also want to retrieve the list of organisations a user belongs to.
  // As a consequence, we need to create our own "LABEL_TOKEN" with "repo" and "read:org" permissions.
  // Such a token allows both to create new labels and fetch user's list of organisations.
  const personalAccessToken = process.env.LABEL_TOKEN;
  if (!personalAccessToken) {
    core.setFailed('LABEL_TOKEN not found');
    process.exit(1);
  }

  // Initialise octokit, required to call Github GraphQL API
  const octokit: InstanceType<typeof GitHub> = getOctokit(personalAccessToken, {
    previews: ['bane'], // The "bane" preview is required for adding, updating, creating and deleting labels.
  });

  // Retrieve labelable object (i.e. a pull request or an issue) info from context
  const labelableRepoOwner = context.repo.owner;
  const labelableRepoName = context.repo.repo;
  let labelable: Labelable;
  if (context.payload.issue?.number) {
    // Retrieve issue
    labelable = await retrieveIssue(
      octokit,
      labelableRepoOwner,
      labelableRepoName,
      context.payload.issue?.number,
    );
  } else if (context.payload.pull_request?.number) {
    // Retrieve PR
    labelable = await retrievePullRequest(
      octokit,
      labelableRepoOwner,
      labelableRepoName,
      context.payload.pull_request?.number,
    );
  } else {
    core.setFailed(
      'Labelable object (i.e. a pull request or an issue) number not found',
    );
    process.exit(1);
  }

  // If author is not part of the MetaMask organisation
  if (!(await userBelongsToMetaMaskOrg(octokit, labelable?.author))) {
    // Add external contributor label to the issue
    await addLabelToLabelable(octokit, labelable, externalContributorLabel);
  }

  // Check if labelable's body matches one of the issue or PR templates ('general-issue.yml' or 'bug-report.yml' or 'pull-request-template.md').
  const templateType: TemplateType = extractTemplateTypeFromBody(
    labelable.body,
  );

  if (labelable.type === LabelableType.Issue) {
    if (templateType === TemplateType.GeneralIssue) {
      console.log("Issue matches 'general-issue.yml' template.");
      await removeLabelFromLabelableIfPresent(
        octokit,
        labelable,
        invalidIssueTemplateLabel,
      );
    } else if (templateType === TemplateType.BugReportIssue) {
      console.log("Issue matches 'bug-report.yml' template.");
      await removeLabelFromLabelableIfPresent(
        octokit,
        labelable,
        invalidIssueTemplateLabel,
      );

      // Extract release version from bug report issue body (if existing)
      const releaseVersion = extractReleaseVersionFromBugReportIssueBody(
        labelable.body,
      );

      // Add regression prod label to the bug report issue if release version was found in issue body
      if (releaseVersion) {
        await addRegressionProdLabelToIssue(octokit, releaseVersion, labelable);
      } else {
        console.log(
          `No release version was found in body of bug report issue ${labelable?.number}.`,
        );
      }
    } else {
      const errorMessage =
        "Issue body does not match any of expected templates ('general-issue.yml' or 'bug-report.yml').";
      console.log(errorMessage);

      // Add label to indicate issue doesn't match any template
      await addLabelToLabelable(octokit, labelable, invalidIssueTemplateLabel);

      // Github action shall fail in case issue body doesn't match any template
      core.setFailed(errorMessage);
      process.exit(1);
    }
  } else if (labelable.type === LabelableType.PullRequest) {
    if (templateType === TemplateType.PullRequest) {
      console.log("PR matches 'pull-request-template.md' template.");
      await removeLabelFromLabelableIfPresent(
        octokit,
        labelable,
        invalidPullRequestTemplateLabel,
      );
    } else {
      const errorMessage =
        "PR body does not match template ('pull-request-template.md').";
      console.log(errorMessage);

      // Add label to indicate PR body doesn't match template
      await addLabelToLabelable(
        octokit,
        labelable,
        invalidPullRequestTemplateLabel,
      );

      // Github action shall fail in case PR doesn't match template
      core.setFailed(errorMessage);
      process.exit(1);
    }
  } else {
    core.setFailed(
      `Shall never happen: Labelable is neither an issue nor a PR (${JSON.stringify(
        labelable,
      )}).`,
    );
    process.exit(1);
  }
}

// This helper function checks if body matches one of the issue or PR templates ('general-issue.yml' or 'bug-report.yml' or 'pull-request-template.md')
function extractTemplateTypeFromBody(body: string): TemplateType {
  for (const [templateType, template] of templates) {
    let matches = true;

    for (const title of template.titles) {
      if (!body.includes(title)) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return templateType;
    }
  }

  return TemplateType.None;
}

// This helper function extracts release version from bug report issue's body.
function extractReleaseVersionFromBugReportIssueBody(
  body: string,
): string | undefined {
  // Remove newline characters
  const cleanedBody = body.replace(/\r?\n/g, ' ');

  // Extract version from the cleaned body
  const regex = /### Version\s+((.*?)(?=  |$))/;
  const versionMatch = cleanedBody.match(regex);
  const version = versionMatch?.[1];

  // Check if version is in the format x.y.z
  if (version && !/^(\d+\.)?(\d+\.)?(\*|\d+)$/.test(version)) {
    throw new Error('Version is not in the format x.y.z');
  }

  return version;
}

// This function adds the correct "regression-prod-x.y.z" label to the issue, and removes other ones
async function addRegressionProdLabelToIssue(
  octokit: InstanceType<typeof GitHub>,
  releaseVersion: string,
  issue: Labelable,
): Promise<void> {
  // Craft regression prod label to add
  const regressionProdLabel: Label = {
    name: `regression-prod-${releaseVersion}`,
    color: '5319E7', // violet
    description: `Regression bug that was found in production in release ${releaseVersion}`,
  };

  let regressionProdLabelFound: boolean = false;
  const regressionProdLabelsToBeRemoved: {
    id: string;
    name: string;
  }[] = [];

  // Loop over issue's labels, to see if regression labels are either missing, or to be removed
  issue?.labels?.forEach((label) => {
    if (label?.name === regressionProdLabel.name) {
      regressionProdLabelFound = true;
    } else if (label?.name?.startsWith('regression-prod-')) {
      regressionProdLabelsToBeRemoved.push(label);
    }
  });

  // Add regression prod label to the issue if missing
  if (regressionProdLabelFound) {
    console.log(
      `Issue ${issue?.number} already has ${regressionProdLabel.name} label.`,
    );
  } else {
    console.log(
      `Add ${regressionProdLabel.name} label to issue ${issue?.number}.`,
    );
    await addLabelToLabelable(octokit, issue, regressionProdLabel);
  }

  // Remove other regression prod label from the issue
  await Promise.all(
    regressionProdLabelsToBeRemoved.map((label) => {
      removeLabelFromLabelable(octokit, issue, label?.id);
    }),
  );
}

// This function checks if user belongs to MetaMask organization on Github
async function userBelongsToMetaMaskOrg(
  octokit: InstanceType<typeof GitHub>,
  username: string,
): Promise<boolean> {
  const userBelongsToMetaMaskOrgQuery = `
    query UserBelongsToMetaMaskOrg($login: String!) {
      user(login: $login) {
        organization(login: "MetaMask") {
          id
        }
      }
    }
  `;

  const userBelongsToMetaMaskOrgResult: {
    user: {
      organization: {
        id: string;
      };
    };
  } = await octokit.graphql(userBelongsToMetaMaskOrgQuery, { login: username });

  return Boolean(userBelongsToMetaMaskOrgResult?.user?.organization?.id);
}
