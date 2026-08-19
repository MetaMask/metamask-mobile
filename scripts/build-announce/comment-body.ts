/**
 * Renders the RC build PR comment.
 *
 * Two shapes, chosen by whether the run delivered binaries or an OTA update:
 * - native: a download table for TestFlight and the Android APK
 * - OTA: the published commit, and an explicit note that there is nothing to install
 */

import { RC_BUILD_COMMENT_MARKER, TESTFLIGHT_URL, isValidUrl } from './utils';
import {
  buildTestPlanSection,
  buildTestPlanFailureSection,
} from './test-plan-section';
import {
  buildEnvValidationSection,
  buildEnvValidationFailureSection,
} from './env-validation-section';
import {
  buildWhatsInRcSection,
  buildWhatsInRcFailureSection,
  type WhatsInRcResult,
} from './cherry-picks-section';
import type {
  BuildInfo,
  OtaUpdateInfo,
  TestPlanResult,
  EnvValidationResult,
} from './types';

/**
 * Builds the build links section of the comment
 */
export function buildBuildLinksSection(buildInfo: BuildInfo): string {
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
 * Builds the OTA section, which replaces the download table when the change shipped as an
 * update rather than as new binaries.
 */
export function buildOtaUpdateSection(otaUpdate: OtaUpdateInfo): string {
  const { commitShortSha, nativeBuildNumber, baselineShortSha } = otaUpdate;

  return `This change shipped as an OTA update to the \`rc\` channel — **there is nothing new to install**. Reopen the app you already have to pick it up.

| Field | Value |
| :--- | :--- |
| **Commit** | \`${commitShortSha}\` |
| **Runs on native build** | \`${nativeBuildNumber}\` (\`${baselineShortSha}\`) |

Settings > About MetaMask shows \`ota ${commitShortSha}\` once the update is active.`;
}

/**
 * Builds the "More Info" collapsible section
 */
export function buildMoreInfoSection(buildInfo: BuildInfo): string {
  const { semver, iosBuildNumber, androidBuildNumber, pipelineUrl, otaUpdate } =
    buildInfo;
  const pipelineLink = isValidUrl(pipelineUrl)
    ? `[View Pipeline](${pipelineUrl})`
    : 'Not available';

  // No binaries were produced on the OTA path, so build numbers would be empty or stale.
  const buildLines = otaUpdate
    ? [
        `*   **OTA Commit**: \`${otaUpdate.commitShortSha}\``,
        `*   **Native Build Number**: \`${otaUpdate.nativeBuildNumber}\` (\`${otaUpdate.baselineShortSha}\`)`,
      ]
    : [
        `*   **iOS Build Number**: \`${iosBuildNumber}\``,
        `*   **Android Build Number**: \`${androidBuildNumber}\``,
      ];

  return `<details>
<summary>More Info</summary>

*   **Version**: \`${semver}\`
${buildLines.join('\n')}
*   **Build Pipeline**: ${pipelineLink}
</details>`;
}

/**
 * Builds the complete PR comment body
 */
export function buildCommentBody(
  buildInfo: BuildInfo,
  testPlan: TestPlanResult | null,
  envValidation: {
    androidResult?: EnvValidationResult;
    iosResult?: EnvValidationResult;
    error?: string;
  },
  whatsInRc: {
    result?: WhatsInRcResult;
    error?: string;
  },
  testPlanError?: string,
): string {
  const { otaUpdate } = buildInfo;

  let body = otaUpdate
    ? `${RC_BUILD_COMMENT_MARKER}
### :satellite: RC OTA Update Published

${buildOtaUpdateSection(otaUpdate)}

${buildMoreInfoSection(buildInfo)}

`
    : `${RC_BUILD_COMMENT_MARKER}
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
  // Pass build number for unique anchor IDs (so Slack can link to correct comment).
  // OTA deliveries have no build number of their own, so the published commit discriminates
  // instead. Must stay in step with the anchor suffix in scripts/slack-rc-notification.mjs.
  if (whatsInRc.result) {
    const anchorDiscriminator =
      otaUpdate?.commitShortSha ?? buildInfo.androidBuildNumber;
    const section = buildWhatsInRcSection(whatsInRc.result, anchorDiscriminator);
    if (section) {
      body += `---\n\n`;
      body += section;
    }
  } else if (whatsInRc.error) {
    body += `---\n\n`;
    body += buildWhatsInRcFailureSection(whatsInRc.error);
  }

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
