/**
 * Utility functions for RC Build Announce
 *
 * Includes URL validation, comment management, and test plan generation.
 */

import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import type { TestPlanResult } from './types';

export const RC_BUILD_COMMENT_MARKER = '<!-- metamask-bot-rc-build-announce -->';
export const TESTFLIGHT_URL = 'https://testflight.apple.com/join/hBrjtFuA';

/**
 * Checks if a URL value is valid (not empty, null, placeholder, and proper URL format).
 */
export function isValidUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed === '' ||
    trimmed === 'n/a' ||
    trimmed === 'null' ||
    trimmed === 'undefined'
  ) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Minimizes (hides) a comment using GitHub GraphQL API.
 */
export async function minimizeComment(
  octokit: Octokit,
  nodeId: string,
): Promise<boolean> {
  try {
    await octokit.graphql(
      `
      mutation MinimizeComment($id: ID!, $classifier: ReportedContentClassifiers!) {
        minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
          minimizedComment {
            isMinimized
            minimizedReason
          }
        }
      }
      `,
      {
        id: nodeId,
        classifier: 'OUTDATED',
      },
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to minimize comment ${nodeId}:`, message);
    return false;
  }
}

/**
 * Gets existing RC build comments for a PR
 */
export async function getExistingRcComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<{ id: number; node_id: string; body: string }[]> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
  });

  return comments.filter(
    (comment) => comment.body && comment.body.includes(RC_BUILD_COMMENT_MARKER),
  ) as { id: number; node_id: string; body: string }[];
}

/**
 * Posts a comment to a PR
 */
export async function postComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

/**
 * Generates a test plan using the e2e-ai-analyzer tool.
 * Returns the parsed test plan or null if generation fails.
 */
export async function generateTestPlan(
  prNumber: number,
  version: string,
  timeoutMs: number = 300000,
): Promise<TestPlanResult | null> {
  const projectRoot = resolve(__dirname, '../..');
  const outputFile = join(projectRoot, 'release-test-plan.json');

  // Clean up any existing output file
  if (existsSync(outputFile)) {
    unlinkSync(outputFile);
  }

  console.log(`Generating test plan for PR #${prNumber}, version ${version}...`);

  try {
    // Run the e2e-ai-analyzer
    execSync(
      `node -r esbuild-register tests/tools/e2e-ai-analyzer --mode generate-test-plan --pr ${prNumber} --auto-ff -v ${version}`,
      {
        cwd: projectRoot,
        timeout: timeoutMs,
        stdio: 'inherit',
        env: {
          ...process.env,
          GENERATE_FILES: 'true',
        },
      },
    );

    // Check if output file was created
    if (!existsSync(outputFile)) {
      console.warn('Test plan generation completed but no output file found');
      return null;
    }

    // Parse and return the test plan
    const content = readFileSync(outputFile, 'utf-8');
    const testPlan = JSON.parse(content) as TestPlanResult;

    console.log(
      `Test plan generated successfully: ${testPlan.scenarios?.length || 0} scenarios`,
    );

    return testPlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Test plan generation failed: ${message}`);
    return null;
  }
}

/**
 * Parses environment variables for build info
 */
export function parseBuildInfo(): {
  semver: string;
  iosBuildNumber: string;
  androidBuildNumber: string;
  pipelineUrl?: string;
  androidPublicUrl?: string;
} {
  const {
    SEMVER,
    IOS_BUILD_NUMBER,
    ANDROID_BUILD_NUMBER,
    BUILD_PIPELINE_URL,
    ANDROID_PUBLIC_URL,
  } = process.env;

  return {
    semver: SEMVER || 'Unknown',
    iosBuildNumber: IOS_BUILD_NUMBER || 'Unknown',
    androidBuildNumber: ANDROID_BUILD_NUMBER || 'Unknown',
    pipelineUrl: BUILD_PIPELINE_URL,
    androidPublicUrl: ANDROID_PUBLIC_URL,
  };
}

/**
 * Parses GitHub context from environment variables
 */
export function parseGitHubContext(): {
  owner: string;
  repo: string;
  prNumber: number;
  token: string;
} {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER } = process.env;

  if (!GITHUB_TOKEN?.trim() || !GITHUB_REPOSITORY?.trim() || !PR_NUMBER?.trim()) {
    throw new Error(
      'Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER',
    );
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!owner || !repo) {
    throw new Error(
      `GITHUB_REPOSITORY must be in format owner/repo, got: ${GITHUB_REPOSITORY}`,
    );
  }

  const prNumber = parseInt(PR_NUMBER, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
  }

  return { owner, repo, prNumber, token: GITHUB_TOKEN };
}
