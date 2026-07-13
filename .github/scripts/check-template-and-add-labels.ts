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
  RegressionStage,
  craftRegressionLabel,
  externalContributorLabel,
  needsTriageLabel,
  areaSentryLabel,
  invalidIssueTemplateLabel,
  invalidPullRequestTemplateLabel,
} from './shared/label';
import { TemplateType, templates } from './shared/template';
import { retrievePullRequest } from './shared/pull-request';
import { runAllChecks } from './shared/pr-template-checks';
import {
  renderFailureComment,
  upsertStickyComment,
} from './shared/pr-template-comment';

const knownBots = ["metamaskbot", "metamaskbotv2", "dependabot", "github-actions", "sentry-io", "devin-ai-integration", "runway-github" , "cursor", "mm-token-exchange-service", "metamask-ci"];

// GitHub App / bot logins that cannot be resolved as User in GraphQL (user(login:) returns null).
// Issues/PRs from these actors still get full template and label checks; we only skip the org check.
const loginsExemptFromOrgCheck = ["issuebridge"];

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

  // If author is not part of the MetaMask organisation, add external contributor label.
  // Skip org check for loginsExemptFromOrgCheck (e.g. issuebridge): GraphQL user(login) does not resolve apps, and we treat them as internal.
  if (
    !knownBots.includes(labelable?.author) &&
    !loginsExemptFromOrgCheck.includes(labelable?.author) &&
    !(await userBelongsToMetaMaskOrg(octokit, labelable?.author))
  ) {
    await addLabelToLabelable(octokit, labelable, externalContributorLabel);
  }

  // Check if labelable's body matches one of the issue or PR templates ('general-issue.yml' or 'bug-report.yml' or 'pull-request-template.md').
  const templateType: TemplateType = extractTemplateTypeFromBody(
    labelable.body,
  );

  // If labelable's author is a bot we skip the rest of the script, including the template checks as bots don't use templates.
  // Exception: For issues created the 'sentry-io' bot, we don't skip the rest of the script because there's a specific handling for those issues.
  if (knownBots.includes(labelable.author) && labelable.author !== 'sentry-io') {
    console.log(`${labelable.type === LabelableType.PullRequest ? 'PR' : 'Issue'} was created by a bot (${labelable.author}). Skip template checks.`);
    process.exit(0); // Stop the process and exit with a success status code
  }

  if (labelable.type === LabelableType.Issue) {

    if (labelable.author === 'sentry-io') {
      console.log(
        `Issue ${labelable?.number} was created through Sentry. Issue's description doesn't need to match issue template in that case. Skip template checks.`,
      );
      await removeLabelFromLabelableIfPresent(
        octokit,
        labelable,
        invalidIssueTemplateLabel,
      );
      // Add needs triage label ONLY if issue is created (not updated)
      if (context.payload.action === 'opened') {
        await addNeedsTriageLabelToIssue(octokit, labelable);
      }
      await checkAndRemoveNeedsTriageIfFullyLabeled(octokit, labelable);

      // Add area-Sentry label to the bug report issue
      await addAreaSentryLabelToIssue(octokit, labelable);
      process.exit(0); // Stop the process and exit with a success status code
    }

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

      // Add regression label to the bug report issue
      await addRegressionLabelToIssue(octokit, labelable);

      // Add needs triage label ONLY if issue is created (not updated)
      if (context.payload.action === 'opened') {
        await addNeedsTriageLabelToIssue(octokit, labelable);
      }
      await checkAndRemoveNeedsTriageIfFullyLabeled(octokit, labelable);

    } else {
      const errorMessage =
        "Issue body does not match any of expected templates ('general-issue.yml' or 'bug-report.yml').\n\nMake sure issue's body includes all section titles.\n\nSections titles are listed here: https://github.com/MetaMask/metamask-mobile/blob/main/.github/scripts/shared/template.ts#L14-L37";
      console.log(errorMessage);

      // Add label to indicate issue doesn't match any template
      await addLabelToLabelable(octokit, labelable, invalidIssueTemplateLabel);
      await checkAndRemoveNeedsTriageIfFullyLabeled(octokit, labelable);
      
      // Github action shall fail in case issue body doesn't match any template
      core.setFailed(errorMessage);
      process.exit(1);
    }
  } else if (labelable.type === LabelableType.PullRequest) {
    // PRs targeting non-main branches (e.g. release sync / cherry-pick branches) do not require
    // a fully filled PR template — those workflows bypass manual testing and app-impact review.
    // We exit 0 here (rather than adding a workflow-level `if:` condition) because GitHub branch
    // protection treats a *skipped* required check as a failure; an early process.exit(0) produces
    // a genuine green "passed" status, which is what non-main PRs need.
    const baseBranch = context.payload.pull_request?.base?.ref;
    if (baseBranch !== 'main') {
      console.log(
        `PR #${labelable.number} targets branch '${baseBranch}', not 'main'. ` +
        `PR template checks are only enforced on PRs targeting 'main'.`,
      );
      // Clean up any stale failure state left from before this rule existed.
      await removeLabelFromLabelableIfPresent(octokit, labelable, invalidPullRequestTemplateLabel);
      await upsertStickyComment(octokit, labelable, null);
      process.exit(0);
    }

    const hasNoChangelogLabel = labelable.labels?.some(
      (label) => label.name === 'no-changelog',
    );

    // Section-heading check: every expected `## **…**` body heading must be present.
    // The INVALID-PR-TEMPLATE label tracks this check only (pre-#30541 semantics) —
    // semantic failures surface through the sticky comment and exit status instead.
    const sectionHeadingsMissing = templateType !== TemplateType.PullRequest;

    if (sectionHeadingsMissing) {
      await addLabelToLabelable(octokit, labelable, invalidPullRequestTemplateLabel);
    } else {
      await removeLabelFromLabelableIfPresent(octokit, labelable, invalidPullRequestTemplateLabel);
    }

    const failures: { ok: false; reason: string; blocking: boolean }[] = [];

    if (sectionHeadingsMissing) {
      // Section-heading mismatch is informational (non-blocking), matching pre-#30541 behavior.
      failures.push({
        ok: false,
        reason:
          'PR body does not match `pull-request-template.md` (one or more section headings are missing). See https://github.com/MetaMask/metamask-mobile/blob/main/.github/scripts/shared/pr-template-checks.ts#L15-L23.',
        blocking: false,
      });
    } else {
      failures.push(...runAllChecks(labelable.body, Boolean(hasNoChangelogLabel)));
    }

    if (failures.length > 0) {
      const blockingFailures = failures.filter((f) => f.blocking);
      const warningFailures = failures.filter((f) => !f.blocking);

      await upsertStickyComment(
        octokit,
        labelable,
        renderFailureComment({
          blocking: blockingFailures.map((f) => f.reason),
          warning: warningFailures.map((f) => f.reason),
        }),
      );

      if (blockingFailures.length > 0) {
        const bullets = blockingFailures.map((f) => `- ${f.reason}`).join('\n');
        core.setFailed(`PR template has blocking issues:\n${bullets}`);
        process.exit(1);
        return;
      }

      const bullets = warningFailures.map((f) => `- ${f.reason}`).join('\n');
      core.warning(`PR template has warnings (informational, does not block merging):\n${bullets}`);
      process.exit(0);
      return;
    }

    console.log("PR matches 'pull-request-template.md' template and is materially complete.");
    await upsertStickyComment(octokit, labelable, null);
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

// This helper function extracts regression stage (Development, Testing, Production) from bug report issue's body.
function extractRegressionStageFromBugReportIssueBody(
  body: string,
): RegressionStage | undefined {
  const detectionStageRegex = /### Where was this bug found\?\s*\n\s*(.*)/i;
  const match = body.match(detectionStageRegex);
  const extractedAnswer = match ? match[1].trim() : undefined;

  switch (extractedAnswer) {
    case 'Live version (from official store)':
      return RegressionStage.Production;
    case 'Internal release testing':
      return RegressionStage.Testing;
    default:
      return undefined;
  }
}

// This helper function extracts release version from bug report issue's body.
function extractReleaseVersionFromBugReportIssueBody(
  body: string,
): string | undefined {
  // Remove newline characters
  const cleanedBody = body.replace(/\r?\n/g, ' ');

  // Extract version from the cleaned body
  const regex = /### Version\s+(.*?)(?=\s+###|$)/;
  const versionMatch = cleanedBody.match(regex);
  const fullVersionString = versionMatch?.[1]?.trim();
  
  // Extract just the x.x.x part from the full version string
  const versionRegex = /(\d+\.\d+\.\d+)/;
  const semanticVersionMatch = fullVersionString?.match(versionRegex);
  const version = semanticVersionMatch?.[1];

  // Check if version is in the format x.y.z
  if (version && !/^(\d+\.)?(\d+\.)?(\*|\d+)$/.test(version)) {
    throw new Error('Version is not in the format x.y.z');
  }

  return version;
}

// This function adds the "needs-triage" label to the issue if it doesn't have it
async function addNeedsTriageLabelToIssue(
  octokit: InstanceType<typeof GitHub>,
  issue: Labelable,
): Promise<void> {
  await addLabelToLabelable(octokit, issue, needsTriageLabel);
}
// This function adds the "area-Sentry" label to the issue if it doesn't have it
async function addAreaSentryLabelToIssue(
  octokit: InstanceType<typeof GitHub>,
  issue: Labelable,
): Promise<void> {
  await addLabelToLabelable(octokit, issue, areaSentryLabel);
}

// This function adds the correct regression label to the issue, and removes other ones
async function addRegressionLabelToIssue(
  octokit: InstanceType<typeof GitHub>,
  issue: Labelable,
): Promise<void> {
  // Extract regression stage from bug report issue body (if existing)
  const regressionStage = extractRegressionStageFromBugReportIssueBody(
    issue.body,
  );

  // Extract release version from bug report issue body (if existing)
  const releaseVersion = extractReleaseVersionFromBugReportIssueBody(
    issue.body,
  );

  // Craft regression label to add
  const regressionLabel: Label = craftRegressionLabel(regressionStage, releaseVersion);

  let regressionLabelFound: boolean = false;
  const regressionLabelsToBeRemoved: {
    id: string;
    name: string;
  }[] = [];

  // Loop over issue's labels, to see if regression labels are either missing, or to be removed
  issue?.labels?.forEach((label) => {
    if (label?.name === regressionLabel.name) {
      regressionLabelFound = true;
    } else if (label?.name?.startsWith('regression-')) {
      regressionLabelsToBeRemoved.push(label);
    }
  });

  // Add regression prod label to the issue if missing
  if (regressionLabelFound) {
    console.log(
      `Issue ${issue?.number} already has ${regressionLabel.name} label.`,
    );
  } else {
    console.log(
      `Add ${regressionLabel.name} label to issue ${issue?.number}.`,
    );
    await addLabelToLabelable(octokit, issue, regressionLabel);
  }

  // Remove other regression prod label from the issue
  await Promise.all(
    regressionLabelsToBeRemoved.map((label) => {
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

// This function checks if issue has both team and severity labels and removes needs-triage label if present
async function checkAndRemoveNeedsTriageIfFullyLabeled(
  octokit: InstanceType<typeof GitHub>,
  issue: Labelable,
): Promise<void> {
  let hasTeamLabel = false;
  let hasSeverityLabel = false;

  for (const label of issue.labels || []) {
    // Check for team labels
    if (
      label.name.startsWith('team-') ||
      label.name === externalContributorLabel.name
    ) {
      console.log(`Issue contains a team label: ${label.name}`);
      hasTeamLabel = true;
    }
    // Check for severity labels (Sev0-urgent, Sev1-high, etc.)
    if (/^Sev\d-\w+$/.test(label.name)) {
      console.log(`Issue contains a severity label: ${label.name}`);
      hasSeverityLabel = true;
    }
  }

  // If both team and severity labels are present, remove needs-triage label
  if (hasTeamLabel && hasSeverityLabel) {
    console.log(
      'Both team and severity labels found. Removing needs-triage label if present...',
    );
    await removeLabelFromLabelableIfPresent(octokit, issue, needsTriageLabel);
  }
}
