/**
 * Slack RC / Production Build Notification Script
 *
 * Posts a Slack message after an RC or production build with download links.
 * RC also links to the cherry-picks section in the release PR comment.
 *
 * Required env: SEMVER, SLACK_BOT_TOKEN
 * Optional env: IOS_BUILD_NUMBER, ANDROID_BUILD_NUMBER, ANDROID_PUBLIC_URL
 *               (defaults to the public Runway release-candidates bucket —
 *               see scripts/runway-public-buckets.mjs — override only for
 *               testing a different bucket), IOS_PUBLIC_URL, BUILD_PIPELINE_URL,
 *               PR_NUMBER, GITHUB_REPOSITORY,
 *               BUILD_KIND (rc | production; default rc),
 *               SLACK_RC_NOTIFICATION_DRY_RUN,
 *               ANDROID_PLAY_STORE_CHECK_MRKDWN_FILE (PLAY_STORE_CHECK_STATUS=pass|fail)
 */

import fs from 'fs';
import { isValidUrl, postToSlack } from './slack-shared.mjs';
import { RUNWAY_BUCKET_RELEASE_CANDIDATES } from './runway-public-buckets.mjs';

const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

/**
 * Optional Android Play Store lint/bundletool report from CI (see android-play-store-check-slack.mjs).
 * @returns {string|null} Slack mrkdwn body or null to omit
 */
function loadPlayStoreCheckMrkdwn() {
  const p = process.env.ANDROID_PLAY_STORE_CHECK_MRKDWN_FILE?.trim();
  if (!p || !fs.existsSync(p)) {
    return null;
  }
  const raw = fs.readFileSync(p, 'utf8').trim();
  if (!raw) {
    return null;
  }
  const lines = raw.split('\n');
  const statusLine = lines[0] ?? '';
  if (statusLine === 'PLAY_STORE_CHECK_STATUS=pass') {
    return null;
  }
  const body = lines.slice(1).join('\n').trim();
  return body || null;
}

function resolveBuildKind(buildKind) {
  return String(buildKind || 'rc').toLowerCase() === 'production'
    ? 'production'
    : 'rc';
}

/**
 * Build the Slack message payload
 * @param {Object} options - Message options
 * @param {string} [options.buildKind] - rc (default) or production
 * @param {string|null} [options.playStoreCheckMrkdwn] - Optional mrkdwn from Android Play Store check
 * @returns {Object} Slack message payload
 */
function buildSlackMessage(options) {
  const {
    version,
    buildNumber,
    androidBuildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    prNumber,
    playStoreCheckMrkdwn,
    buildKind: buildKindInput,
  } = options;

  const buildKind = resolveBuildKind(buildKindInput);
  const isProduction = buildKind === 'production';
  const label = isProduction ? 'Production' : 'RC';

  const androidLink = isProduction
    ? isValidUrl(pipelineUrl)
      ? `*Android APK:*\n<${pipelineUrl}|Download from CI>`
      : '*Android APK:*\n_Not available_'
    : isValidUrl(androidUrl)
      ? `*Android APK:*\n<${androidUrl}|Download>`
      : '*Android APK:*\n_Not available_';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚀 Mobile ${label} Build v${version} (${buildNumber})`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Version:*\n${version}`,
        },
        {
          type: 'mrkdwn',
          text: `*Build Number:*\n${buildNumber}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📦 Download Links:*',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: androidLink,
        },
        {
          type: 'mrkdwn',
          text: isValidUrl(iosUrl)
            ? `*iOS Build:*\n<${iosUrl}|TestFlight>`
            : '*iOS Build:*\n<https://testflight.apple.com/join/hBrjtFuA|Check TestFlight>',
        },
      ],
    },
  ];

  // Cherry-picks are RC-only (linked to the release PR comment).
  // Note: GitHub prefixes user-provided anchor IDs with 'user-content-'
  // We use build number in anchor to link to the correct comment (not older builds)
  if (!isProduction) {
    if (prNumber) {
      const anchorSuffix = androidBuildNumber && androidBuildNumber !== 'N/A' ? `-${androidBuildNumber}` : '';
      const cherryPicksLink = `<${REPO_URL}/pull/${prNumber}#user-content-cherry-picks${anchorSuffix}|View cherry-picks>`;
      blocks.push(
        {
          type: 'divider',
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🍒 Cherry-picks:* ${cherryPicksLink}`,
          },
        },
      );
    } else {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_Cherry-picks available in the release PR._`,
        },
      });
    }
  }

  if (playStoreCheckMrkdwn) {
    const truncated =
      playStoreCheckMrkdwn.length > 2800
        ? `${playStoreCheckMrkdwn.slice(0, 2800)}\n_…truncated_`
        : playStoreCheckMrkdwn;
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠️ Android Play Store check (non-blocking)*\n${truncated}`,
        },
      },
    );
  }

  // Add pipeline and RC notes links
  if (pipelineUrl || (!isProduction && prNumber)) {
    const links = [];
    if (pipelineUrl) {
      links.push(`<${pipelineUrl}|View Build Pipeline>`);
    }
    if (!isProduction && prNumber) {
      const anchorSuffix = androidBuildNumber && androidBuildNumber !== 'N/A' ? `-${androidBuildNumber}` : '';
      links.push(`<${REPO_URL}/pull/${prNumber}#user-content-whats-in-this-rc${anchorSuffix}|View full RC notes>`);
    }
    if (links.length > 0) {
      blocks.push(
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: links.join(' | '),
            },
          ],
        },
      );
    }
  }

  return {
    blocks,
    text: `🚀 Mobile ${label} Build v${version} (${buildNumber}) is ready!`, // Fallback text
  };
}

/**
 * Get the Slack channel name for a release version
 * @param {string} version - The version string
 * @returns {string} The channel name
 */
function getSlackChannel(version) {
  const formattedVersion = version.replace(/\./g, '-');
  return `#release-mobile-${formattedVersion}`;
}

/**
 * Main function
 */
async function main() {
  const dryRunEnv = process.env.SLACK_RC_NOTIFICATION_DRY_RUN;
  const isDryRun =
    dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';

  // Validate required environment variables (fail open - just log and return).
  // Dry-run only needs SEMVER so you can inspect blocks without Slack or a token.
  const requiredEnvVars = isDryRun ? ['SEMVER'] : ['SEMVER', 'SLACK_BOT_TOKEN'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const version = process.env.SEMVER;
  const iosBuildNumber = process.env.IOS_BUILD_NUMBER || 'N/A';
  const androidBuildNumber = process.env.ANDROID_BUILD_NUMBER || 'N/A';
  const buildNumber = `iOS ${iosBuildNumber} / Android ${androidBuildNumber}`;
  // Public Runway bucket link, not a secret — see scripts/runway-public-buckets.mjs.
  // ANDROID_PUBLIC_URL remains an override hook (e.g. for testing a different bucket).
  const androidUrl = process.env.ANDROID_PUBLIC_URL || RUNWAY_BUCKET_RELEASE_CANDIDATES;
  const iosUrl = process.env.IOS_PUBLIC_URL;
  const pipelineUrl = process.env.BUILD_PIPELINE_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const buildKind = resolveBuildKind(process.env.BUILD_KIND);
  const label = buildKind === 'production' ? 'Production' : 'RC';

  const prNumber = process.env.PR_NUMBER || '';
  const playStoreCheckMrkdwn = loadPlayStoreCheckMrkdwn();
  const expectedChannelName = getSlackChannel(version);

  console.log(`\n📣 Preparing Slack notification for ${label} v${version} (${buildNumber})`);
  if (prNumber) {
    console.log(`📍 Release PR: #${prNumber}`);
  }
  if (isDryRun) {
    console.log('🧪 DRY RUN: will print payload JSON and not call Slack');
  } else {
    console.log(`📍 Target channel: ${expectedChannelName}`);
  }

  // Build and send the message
  console.log('\n📤 Posting to Slack...');

  const payload = buildSlackMessage({
    version,
    buildNumber,
    androidBuildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    prNumber,
    playStoreCheckMrkdwn,
    buildKind,
  });

  if (isDryRun) {
    const preview = {
      channel: expectedChannelName,
      text: payload.text,
      blocks: payload.blocks,
    };
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify(preview, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  const result = await postToSlack(botToken, expectedChannelName, payload);

  if (result.success) {
    console.log(`\n✅ ${label} notification sent to ${expectedChannelName}`);
  } else if (result.channelNotFound) {
    console.warn(`\n⚠️ Channel ${expectedChannelName} not found in Slack workspace`);
    console.warn('   This could mean:');
    console.warn('   - The release channel has not been created yet');
    console.warn('   - The bot does not have access to the channel');
    console.warn('   - The channel name pattern is different');
    console.warn('Skipping Slack notification (non-critical)');
  } else {
    // Fail open - log the error but don't exit with error code
    console.log(`\n⚠️ ${label} notification failed but continuing (non-critical)`);
  }
}

// Run - fail open on errors (non-critical notification)
main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
  // Don't exit with error code - this is a non-critical notification
});
