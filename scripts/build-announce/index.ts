// RC Build Announce - Posts RC build comments to GitHub PRs with build links and AI test plan

import { Octokit } from '@octokit/rest';
import {
  RC_BUILD_COMMENT_MARKER,
  TESTFLIGHT_URL,
  isValidUrl,
  minimizeComment,
  getExistingRcComments,
  postComment,
  generateTestPlan,
  parseBuildInfo,
  parseGitHubContext,
} from './utils';
import {
  buildTestPlanSection,
  buildTestPlanFailureSection,
} from './test-plan-section';
import type { BuildInfo, TestPlanResult } from './types';

/**
 * Builds the build links section of the comment
 */
function buildBuildLinksSection(buildInfo: BuildInfo): string {
  const rows: string[] = [];
  const { semver, iosBuildNumber, androidBuildNumber, pipelineUrl, androidPublicUrl } =
    buildInfo;

  // iOS always uses TestFlight link with build number reference
  rows.push(
    `| **iOS** | [TestFlight](${TESTFLIGHT_URL}) | Go to TestFlight and download build \`${iosBuildNumber}\` |`,
  );

  // Android - prefer direct public URL; fall back to CI pipeline link
  if (isValidUrl(androidPublicUrl)) {
    rows.push(
      `| **Android** | [Install](${androidPublicUrl}) | RC ${semver} (${androidBuildNumber}) |`,
    );
  } else if (isValidUrl(pipelineUrl)) {
    rows.push(
      `| **Android** | [Download from CI](${pipelineUrl}) | RC ${semver} (${androidBuildNumber}) — download APK artifact from the linked run |`,
    );
  } else {
    rows.push(
      `| **Android** | _See build artifacts_ | RC ${semver} (${androidBuildNumber}) |`,
    );
  }

  return `| Platform | Link | Version |
| :--- | :--- | :--- |
${rows.join('\n')}`;
}

/**
 * Builds the "More Info" collapsible section
 */
function buildMoreInfoSection(buildInfo: BuildInfo): string {
  const { semver, iosBuildNumber, androidBuildNumber, pipelineUrl } = buildInfo;
  const pipelineLink = isValidUrl(pipelineUrl)
    ? `[View Pipeline](${pipelineUrl})`
    : 'Not available';

  return `<details>
<summary>More Info</summary>

*   **Version**: \`${semver}\`
*   **iOS Build Number**: \`${iosBuildNumber}\`
*   **Android Build Number**: \`${androidBuildNumber}\`
*   **Build Pipeline**: ${pipelineLink}
</details>`;
}

/**
 * Builds the complete PR comment body
 */
function buildCommentBody(
  buildInfo: BuildInfo,
  testPlan: TestPlanResult | null,
  testPlanError?: string,
): string {
  let body = `${RC_BUILD_COMMENT_MARKER}
### :rocket: RC Builds Ready for Testing

${buildBuildLinksSection(buildInfo)}

${buildMoreInfoSection(buildInfo)}

`;

  // Add test plan section
  if (testPlan) {
    body += `---\n\n`;
    body += buildTestPlanSection(testPlan);
  } else if (testPlanError) {
    body += buildTestPlanFailureSection(buildInfo.pipelineUrl, testPlanError);
  }
  // If no test plan and no error, we skip the test plan section entirely
  // (this happens when AI keys are not available)

  return body;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log('\n=== RC Build Announce ===\n');

  // Parse environment
  const { owner, repo, prNumber, token } = parseGitHubContext();
  const buildInfo = parseBuildInfo();

  console.log(`Repository: ${owner}/${repo}`);
  console.log(`PR Number: ${prNumber}`);
  console.log(`Version: ${buildInfo.semver}`);
  console.log(`iOS Build: ${buildInfo.iosBuildNumber}`);
  console.log(`Android Build: ${buildInfo.androidBuildNumber}`);

  const octokit = new Octokit({ auth: token });

  // Check if we have AI API keys for test plan generation
  const hasAiKeys =
    process.env.E2E_CLAUDE_API_KEY ||
    process.env.E2E_OPENAI_API_KEY ||
    process.env.E2E_GEMINI_API_KEY;

  let testPlan: TestPlanResult | null = null;
  let testPlanError: string | undefined;

  if (hasAiKeys) {
    console.log('\n=== Generating AI Test Plan ===\n');

    try {
      testPlan = await generateTestPlan(
        prNumber,
        buildInfo.semver,
        300000, // 5 minute timeout
      );

      if (testPlan) {
        // Ensure version is set for JSON link in footer
        if (!testPlan.version) {
          testPlan.version = buildInfo.semver;
        }

        console.log(`\nTest plan generated successfully:`);
        console.log(`  - Risk Score: ${testPlan.summary.releaseRiskScore}`);
        console.log(`  - High Risk Scenarios: ${testPlan.scenarios.filter((s) => s.riskLevel === 'high').length}`);
        console.log(`  - Medium Risk Scenarios: ${testPlan.scenarios.filter((s) => s.riskLevel === 'medium').length}`);
        console.log(`  - Teams Signed Off: ${testPlan.signOffs.signedOff.length}/${testPlan.signOffs.signedOff.length + testPlan.signOffs.needsAttention.length}`);
      }
    } catch (error) {
      testPlan = null;
      testPlanError = error instanceof Error ? error.message : String(error);
      console.error(`\nTest plan generation failed: ${testPlanError}`);
      console.log('Continuing with build links only...');
    }
  } else {
    console.log('\nNo AI API keys found, skipping test plan generation');
  }

  // Build the comment body
  const commentBody = buildCommentBody(buildInfo, testPlan, testPlanError);

  // Post comment and minimize old ones
  console.log(`\n=== Posting Comment to PR #${prNumber} ===\n`);

  try {
    // Find existing RC build comments
    const existingComments = await getExistingRcComments(
      octokit,
      owner,
      repo,
      prNumber,
    );
    console.log(`Found ${existingComments.length} existing RC build comment(s)`);

    // Post new comment
    console.log('Creating new comment with RC build URLs...');
    await postComment(octokit, owner, repo, prNumber, commentBody);
    console.log('Successfully created new comment');

    // Minimize old comments
    if (existingComments.length > 0) {
      console.log(`\nMinimizing ${existingComments.length} older RC build comment(s)...`);
      for (const comment of existingComments) {
        if (comment.node_id) {
          const success = await minimizeComment(octokit, comment.node_id);
          if (success) {
            console.log(`  Minimized comment ${comment.id}`);
          }
        }
      }
    }

    console.log('\n=== Done ===\n');
  } catch (error) {
    console.error('Error posting/minimizing comments:', error);
    if ((error as { status?: number }).status === 403) {
      console.error(
        'Permission denied. Ensure the GITHUB_TOKEN has "pull-requests: write" permission.',
      );
    }
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
