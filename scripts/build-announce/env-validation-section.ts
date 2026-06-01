/**
 * Environment Section Builder
 *
 * Builds the markdown section displaying build environment values
 * to be included in the RC build comment.
 */

import type { EnvValidationResult } from './types';

/**
 * Maps METAMASK_ENVIRONMENT to Remote Feature Flag Env display value
 */
function getRemoteFFEnv(env: string | undefined): string {
  switch (env) {
    case 'production':
      return 'prod';
    case 'rc':
      return 'rc';
    case 'beta':
      return 'beta';
    default:
      return 'dev';
  }
}

/**
 * Maps METAMASK_BUILD_TYPE to Remote Feature Flag Distribution display value
 */
function getRemoteFFDistribution(buildType: string | undefined): string {
  switch (buildType) {
    case 'flask':
      return 'flask';
    case 'main':
    default:
      return 'main';
  }
}

/**
 * Builds the environment section for the PR comment
 * Shows actual environment values similar to "About MetaMask" screen
 */
export function buildEnvValidationSection(
  androidResult?: EnvValidationResult,
  iosResult?: EnvValidationResult,
): string {
  // If no results, return empty
  if (!androidResult && !iosResult) {
    return '';
  }

  const lines: string[] = [];

  lines.push('### :shield: Build Environment\n');

  // Use one result to display (they should be identical for same build config)
  const result = androidResult || iosResult;
  if (!result) return '';

  const env = result.extractedValues.METAMASK_ENVIRONMENT ?? '—';
  const buildType = result.extractedValues.METAMASK_BUILD_TYPE ?? '—';
  const rewardsUrl = result.extractedValues.REWARDS_API_URL ?? '—';
  const portfolioUrl = result.extractedValues.MM_PORTFOLIO_URL ?? '—';
  const rampsEnv = result.extractedValues.RAMPS_ENVIRONMENT ?? '—';

  // Main environment info table (like About MetaMask screen)
  lines.push('| Setting | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| **Environment** | \`${env}\` |`);
  lines.push(`| **Build Type** | \`${buildType}\` |`);
  lines.push(`| **Remote Feature Flag Env** | \`${getRemoteFFEnv(env)}\` |`);
  lines.push(`| **Remote Feature Flag Distribution** | \`${getRemoteFFDistribution(buildType)}\` |`);
  lines.push(`| **Ramps Environment** | \`${rampsEnv}\` |`);
  lines.push('');

  // Detailed info in collapsible section
  lines.push('<details>');
  lines.push('<summary>API URLs & Details</summary>\n');

  lines.push('| API | URL |');
  lines.push('| :--- | :--- |');
  lines.push(`| Rewards API | \`${rewardsUrl}\` |`);
  lines.push(`| Portfolio API | \`${portfolioUrl}\` |`);

  // Add more URLs if available
  const portfolioApiUrl = result.extractedValues.PORTFOLIO_API_URL;
  if (portfolioApiUrl) {
    lines.push(`| Portfolio API (alt) | \`${portfolioApiUrl}\` |`);
  }

  const securityAlertsUrl = result.extractedValues.SECURITY_ALERTS_API_URL;
  if (securityAlertsUrl) {
    lines.push(`| Security Alerts API | \`${securityAlertsUrl}\` |`);
  }

  lines.push('\n**Build Flags:**\n');
  lines.push(`- Build Name: \`${result.buildName}\``);
  lines.push(`- IS_TEST: \`${result.extractedValues.IS_TEST ?? 'false'}\``);

  const rampDevBuild = result.extractedValues.RAMP_DEV_BUILD;
  if (rampDevBuild) {
    lines.push(`- RAMP_DEV_BUILD: \`${rampDevBuild}\``);
  }

  const bridgeDevApis = result.extractedValues.BRIDGE_USE_DEV_APIS;
  if (bridgeDevApis) {
    lines.push(`- BRIDGE_USE_DEV_APIS: \`${bridgeDevApis}\``);
  }

  lines.push('\n</details>\n');

  return lines.join('\n');
}

/**
 * Builds a failure section when environment values could not be extracted
 */
export function buildEnvValidationFailureSection(error: string): string {
  return `### :shield: Build Environment

**Status:** :warning: Not available

<details>
<summary>Details</summary>

Environment values could not be extracted: ${error}

This may happen if:
- Build artifacts are not available
- build-env.json was not generated during the build

</details>

`;
}
