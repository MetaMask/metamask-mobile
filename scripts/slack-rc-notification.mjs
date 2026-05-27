/**
 * Slack RC Build Notification Script
 *
 * Posts a Slack message after an RC build with download links
 * and a link to the cherry-picks section in the release PR comment.
 *
 * Required env: SEMVER, SLACK_BOT_TOKEN
 * Optional env: IOS_BUILD_NUMBER, ANDROID_BUILD_NUMBER, ANDROID_PUBLIC_URL,
 *               IOS_PUBLIC_URL, BUILD_PIPELINE_URL, PR_NUMBER, GITHUB_REPOSITORY,
 *               SLACK_RC_NOTIFICATION_DRY_RUN,
 *               ANDROID_PLAY_STORE_CHECK_MRKDWN_FILE (PLAY_STORE_CHECK_STATUS=pass|fail)
 */

import fs from 'fs';

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

/**
 * Check if a URL is valid
 * @param {string|undefined} url - The URL to check
 * @returns {boolean} Whether the URL is valid
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'n/a' || trimmed === 'null' || trimmed === 'undefined') {
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
 * Build the Slack message payload
 * @param {Object} options - Message options
 * @param {string|null} [options.playStoreCheckMrkdwn] - Optional mrkdwn from Android Play Store check
 * @returns {Object} Slack message payload
 */
function buildSlackMessage(options) {
  const {
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    prNumber,
    playStoreCheckMrkdwn,
  } = options;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🚀 Mobile RC Build v${version} (${buildNumber})`,
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
          text: isValidUrl(androidUrl)
            ? `*Android APK:*\n<${androidUrl}|Download>`
            : '*Android APK:*\n_Not available_',
        },
        {
          type: 'mrkdwn',
          text: isValidUrl(iosUrl)
            ? `*iOS Build:*\n<${iosUrl}|TestFlight>`
            : '*iOS Build:*\n_Check TestFlight_',
        },
      ],
    },
  ];

  // Add link to cherry-picks section in PR comment
  if (prNumber) {
    const cherryPicksLink = `<${REPO_URL}/pull/${prNumber}#cherry-picks|View cherry-picks>`;
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
    const releaseNotesMrkdwn = `<${REPO_URL}/tree/release/${version}|View release notes>`;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_Cherry-picks available in the release PR. ${releaseNotesMrkdwn}_`,
      },
    });
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

  // Add pipeline link
  if (pipelineUrl) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<${pipelineUrl}|View Build Pipeline> | <${REPO_URL}/tree/release/${version}|View full release notes>`,
          },
        ],
      },
    );
  }

  return {
    blocks,
    text: `🚀 Mobile RC Build v${version} (${buildNumber}) is ready!`, // Fallback text
  };
}

/**
 * Post message to Slack channel using Web API
 * @param {string} botToken - Slack bot token
 * @param {string} channelName - Channel name to post to
 * @param {Object} payload - Slack message payload
 * @returns {Promise<{success: boolean, channelNotFound: boolean}>}
 */
async function postToSlack(botToken, channelName, payload) {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: channelName,
        blocks: payload.blocks,
        text: payload.text,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      // Check if channel doesn't exist
      if (data.error === 'channel_not_found') {
        return { success: false, channelNotFound: true };
      }
      throw new Error(`Slack API error: ${data.error}`);
    }

    console.log('✅ Slack notification sent successfully');
    return { success: true, channelNotFound: false };
  } catch (error) {
    console.error(`❌ Failed to post to Slack: ${error.message}`);
    return { success: false, channelNotFound: false };
  }
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
  const androidUrl = process.env.ANDROID_PUBLIC_URL;
  const iosUrl = process.env.IOS_PUBLIC_URL;
  const pipelineUrl = process.env.BUILD_PIPELINE_URL;
  const botToken = process.env.SLACK_BOT_TOKEN;

  const prNumber = process.env.PR_NUMBER || '';
  const playStoreCheckMrkdwn = loadPlayStoreCheckMrkdwn();
  const expectedChannelName = getSlackChannel(version);

  console.log(`\n📣 Preparing Slack notification for RC v${version} (${buildNumber})`);
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
    androidUrl,
    iosUrl,
    pipelineUrl,
    prNumber,
    playStoreCheckMrkdwn,
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
    console.log(`\n✅ RC notification sent to ${expectedChannelName}`);
  } else if (result.channelNotFound) {
    console.warn(`\n⚠️ Channel ${expectedChannelName} not found in Slack workspace`);
    console.warn('   This could mean:');
    console.warn('   - The release channel has not been created yet');
    console.warn('   - The bot does not have access to the channel');
    console.warn('   - The channel name pattern is different');
    console.warn('Skipping Slack notification (non-critical)');
  } else {
    // Fail open - log the error but don't exit with error code
    console.log('\n⚠️ RC notification failed but continuing (non-critical)');
  }
}

// Run - fail open on errors (non-critical notification)
main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
  // Don't exit with error code - this is a non-critical notification
});
