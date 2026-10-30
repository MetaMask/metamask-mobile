// RC Build Announce - Posts RC build comments to GitHub PRs with build links.
// The AI test plan is added afterwards by scripts/build-announce/post-test-plan.ts.

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Octokit } from '@octokit/rest';
import {
  RC_BUILD_COMMENT_MARKER,
  TESTFLIGHT_URL,
  isValidUrl,
  minimizeComment,
  getExistingRcComments,
  postComment,
  parseBuildInfo,
  parseGitHubContext,
} from './utils';
import { buildTestPlanPendingSection } from './test-plan-comment';
import {
  buildEnvValidationSection,
  buildEnvValidationFailureSection,
} from './env-validation-section';
import {
  extractWhatsInRc,
  buildWhatsInRcSection,
  buildWhatsInRcFailureSection,
  type WhatsInRcResult,
} from './cherry-picks-section';
import { validateEnv } from './validate-env';
import type { BuildInfo, EnvValidationResult } from './types';

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
 * Look for build-env.json artifacts and extract environment values
 */
function performEnvValidation(): {
  androidResult?: EnvValidationResult;
  iosResult?: EnvValidationResult;
  error?: string;
} {
  const artifactsDir = 'build-env-artifacts';

  if (!existsSync(artifactsDir)) {
    console.log('No build-env-artifacts directory found, skipping env extraction');
    return {};
  }

  const results: {
    androidResult?: EnvValidationResult;
    iosResult?: EnvValidationResult;
    error?: string;
  } = {};

  try {
    // Check for flat path first (in case merge-multiple flattens all artifacts)
    const flatPath = join(artifactsDir, 'build-env.json');
    if (existsSync(flatPath)) {
      console.log(`Found build-env.json at ${flatPath}`);
      const result = validateEnv(flatPath);
      results.androidResult = result;
      return results;
    }

    // Otherwise look in subdirectories
    const dirs = readdirSync(artifactsDir, { withFileTypes: true });

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const buildEnvPath = join(artifactsDir, dir.name, 'build-env.json');

      if (!existsSync(buildEnvPath)) {
        continue;
      }

      console.log(`Found build-env.json at ${buildEnvPath}`);

      // Determine platform from directory name
      const platform = dir.name.includes('android') ? 'android' : 'ios';
      const result = validateEnv(buildEnvPath);

      if (platform === 'android') {
        results.androidResult = result;
      } else {
        results.iosResult = result;
      }
    }
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    console.error(`Environment extraction failed: ${results.error}`);
  }

  return results;
}

/**
 * Builds the complete PR comment body
 */
function buildCommentBody(
  buildInfo: BuildInfo,
  envValidation: {
    androidResult?: EnvValidationResult;
    iosResult?: EnvValidationResult;
    error?: string;
  },
  whatsInRc: {
    result?: WhatsInRcResult;
    error?: string;
  },
): string {
  let body = `${RC_BUILD_COMMENT_MARKER}
### :rocket: RC Builds Ready for Testing

${buildBuildLinksSection(buildInfo)}

${buildMoreInfoSection(buildInfo)}

`;

  // Add environment section
  if (envValidation.androidResult || envValidation.iosResult) {
    body += `---\n\n`;
    body += buildEnvValidationSection(envValidation.androidResult, envValidation.iosResult);
  } else if (envValidation.error) {
    body += `---\n\n`;
    body += buildEnvValidationFailureSection(envValidation.error);
  }

  // Add "What's in this RC" section (cherry-picks + changelog)
  // Pass build number for unique anchor IDs (so Slack can link to correct comment)
  if (whatsInRc.result) {
    const section = buildWhatsInRcSection(whatsInRc.result, buildInfo.androidBuildNumber);
    if (section) {
      body += `---\n\n`;
      body += section;
    }
  } else if (whatsInRc.error) {
    body += `---\n\n`;
    body += buildWhatsInRcFailureSection(whatsInRc.error);
  }

  // The AI test plan is filled in later by rc-ai-test-plan.yml so this comment
  // can be posted as soon as the build links are known.
  body += `---\n\n`;
  body += buildTestPlanPendingSection();

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

  console.log(
    '\nAI test plan is generated separately and added to this comment when it is ready.\n',
  );

  // Extract environment values from build artifacts
  console.log('\n=== Build Environment ===\n');
  const envValidation = performEnvValidation();

  if (envValidation.androidResult || envValidation.iosResult) {
    const result = envValidation.androidResult || envValidation.iosResult;
    console.log(`  - Build Name: ${result?.buildName}`);
    console.log(`  - Environment: ${result?.extractedValues.METAMASK_ENVIRONMENT}`);
  } else if (envValidation.error) {
    console.log(`  - Error: ${envValidation.error}`);
  } else {
    console.log('  - No build-env artifacts found');
  }

  // Extract "What's in this RC" (cherry-picks + changelog) from git history
  console.log('\n=== What\'s in this RC ===\n');
  const whatsInRc: { result?: WhatsInRcResult; error?: string } = {};

  try {
    whatsInRc.result = extractWhatsInRc();
    console.log(`  - Cherry-picks: ${whatsInRc.result.cherryPicks.length} commit(s)`);
    console.log(`  - Changelog: ${whatsInRc.result.changelog.length} commit(s)`);
    if (whatsInRc.result.previousTag) {
      console.log(`  - Previous release: ${whatsInRc.result.previousTag}`);
    }
  } catch (error) {
    whatsInRc.error = error instanceof Error ? error.message : String(error);
    console.error(`  - Error: ${whatsInRc.error}`);
  }

  // Build the comment body
  const commentBody = buildCommentBody(buildInfo, envValidation, whatsInRc);

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
