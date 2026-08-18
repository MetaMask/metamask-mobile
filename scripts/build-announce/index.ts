// RC Build Announce - Posts RC build comments to GitHub PRs with build links and AI test plan

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Octokit } from '@octokit/rest';
import {
  minimizeComment,
  getExistingRcComments,
  postComment,
  generateTestPlan,
  parseBuildInfo,
  parseGitHubContext,
} from './utils';
import { buildCommentBody } from './comment-body';
import {
  extractWhatsInRc,
  type WhatsInRcResult,
} from './cherry-picks-section';
import { validateEnv } from './validate-env';
import type { EnvValidationResult } from './types';

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
  if (buildInfo.otaUpdate) {
    console.log(`OTA commit: ${buildInfo.otaUpdate.commitShortSha}`);
    console.log(
      `Runs on native build: ${buildInfo.otaUpdate.nativeBuildNumber} (${buildInfo.otaUpdate.baselineShortSha})`,
    );
  } else {
    console.log(`iOS Build: ${buildInfo.iosBuildNumber}`);
    console.log(`Android Build: ${buildInfo.androidBuildNumber}`);
  }

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
      } else {
        // generateTestPlan returns null on failure (doesn't throw)
        testPlanError = 'Test plan generation failed - check logs for details';
        console.log('Continuing with build links only...');
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
  const commentBody = buildCommentBody(buildInfo, testPlan, envValidation, whatsInRc, testPlanError);

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
