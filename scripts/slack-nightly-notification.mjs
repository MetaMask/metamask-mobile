/**
 * Slack Nightly Build Notification Script
 *
 * Posts a daily summary of the nightly `main-exp` / `main-rc` builds (iOS +
 * Android) with their Runway download links and build numbers. This is
 * posted on its own daily schedule (nightly-slack-notification.yml, 09:00
 * UTC+1 / 08:00 UTC) rather than right after nightly-build.yml finishes, so
 * it lands in the morning EU time. Metadata (version, build numbers) is read
 * from the nightly-slack-meta artifact emitted by nightly-build.yml.
 *
 * Required env: SEMVER, SLACK_BOT_TOKEN, SLACK_NIGHTLY_CHANNEL
 * Optional env: IOS_EXP_BUILD_NUMBER, IOS_RC_BUILD_NUMBER,
 *               ANDROID_EXP_BUILD_NUMBER, ANDROID_RC_BUILD_NUMBER,
 *               BUILD_PIPELINE_URL, SLACK_NIGHTLY_NOTIFICATION_DRY_RUN
 *               (dry-run only needs SEMVER)
 */

import { postToSlack } from './slack-shared.mjs';
import {
  RUNWAY_BUCKET_NIGHTLY_IOS_EXP,
  RUNWAY_BUCKET_NIGHTLY_IOS_RC,
  RUNWAY_BUCKET_NIGHTLY_ANDROID_EXP,
  RUNWAY_BUCKET_NIGHTLY_ANDROID_RC,
} from './runway-public-buckets.mjs';

const TESTFLIGHT_URL = 'https://testflight.apple.com/join/hBrjtFuA';

/**
 * Build the Slack message payload for the nightly build summary.
 * @param {Object} options - Message options
 * @param {string} options.version - Semantic version (e.g. 8.6.0)
 * @param {string} [options.iosExpBuildNumber] - iOS main-exp build number
 * @param {string} [options.iosRcBuildNumber] - iOS main-rc build number
 * @param {string} [options.androidExpBuildNumber] - Android main-exp build number
 * @param {string} [options.androidRcBuildNumber] - Android main-rc build number
 * @param {string} [options.pipelineUrl] - Link to the Nightly Build workflow run
 * @returns {{blocks: object[], text: string}} Slack message payload
 */
export function buildNightlyMessage(options) {
  const {
    version,
    iosExpBuildNumber = 'N/A',
    iosRcBuildNumber = 'N/A',
    androidExpBuildNumber = 'N/A',
    androidRcBuildNumber = 'N/A',
    pipelineUrl,
  } = options;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `🌙 Mobile Nightly Builds v${version} available`,
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
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*📦 Main RC* _(LD flag: `main-rc`)_',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Android:*\n<${RUNWAY_BUCKET_NIGHTLY_ANDROID_RC}|Download> (build ${androidRcBuildNumber})`,
        },
        {
          type: 'mrkdwn',
          text: `*iOS:*\n<${RUNWAY_BUCKET_NIGHTLY_IOS_RC}|Download> (build ${iosRcBuildNumber})`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${TESTFLIGHT_URL}|TestFlight> — build ${iosRcBuildNumber}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*🧪 Main EXP* _(LD flag: `main-exp`)_',
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Android:*\n<${RUNWAY_BUCKET_NIGHTLY_ANDROID_EXP}|Download> (build ${androidExpBuildNumber})`,
        },
        {
          type: 'mrkdwn',
          text: `*iOS:*\n<${RUNWAY_BUCKET_NIGHTLY_IOS_EXP}|Download> (build ${iosExpBuildNumber})`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${TESTFLIGHT_URL}|TestFlight> — build ${iosExpBuildNumber}`,
        },
      ],
    },
  ];

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
            text: `<${pipelineUrl}|View Nightly Build Pipeline>`,
          },
        ],
      },
    );
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: '_Note: these are not release builds._',
      },
    ],
  });

  return {
    blocks,
    text: `🌙 Mobile Nightly Builds v${version} available (RC Android ${androidRcBuildNumber} / iOS ${iosRcBuildNumber}, EXP Android ${androidExpBuildNumber} / iOS ${iosExpBuildNumber})`,
  };
}

/**
 * Main function
 */
async function main() {
  const dryRunEnv = process.env.SLACK_NIGHTLY_NOTIFICATION_DRY_RUN;
  const isDryRun =
    dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';

  // Validate required environment variables (fail open - just log and return).
  // Dry-run only needs SEMVER so you can inspect blocks without Slack or a token.
  const requiredEnvVars = isDryRun
    ? ['SEMVER']
    : ['SEMVER', 'SLACK_BOT_TOKEN', 'SLACK_NIGHTLY_CHANNEL'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping nightly Slack notification (non-critical)');
    return;
  }

  const version = process.env.SEMVER;
  const botToken = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_NIGHTLY_CHANNEL;

  const payload = buildNightlyMessage({
    version,
    iosExpBuildNumber: process.env.IOS_EXP_BUILD_NUMBER || 'N/A',
    iosRcBuildNumber: process.env.IOS_RC_BUILD_NUMBER || 'N/A',
    androidExpBuildNumber: process.env.ANDROID_EXP_BUILD_NUMBER || 'N/A',
    androidRcBuildNumber: process.env.ANDROID_RC_BUILD_NUMBER || 'N/A',
    pipelineUrl: process.env.BUILD_PIPELINE_URL,
  });

  console.log(`\n📣 Preparing nightly Slack notification for v${version}`);
  if (isDryRun) {
    console.log('🧪 DRY RUN: will print payload JSON and not call Slack');
  } else {
    console.log(`📍 Target channel: ${channel}`);
  }

  if (isDryRun) {
    const preview = {
      channel: channel || '(unset)',
      text: payload.text,
      blocks: payload.blocks,
    };
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify(preview, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  console.log('\n📤 Posting to Slack...');

  const result = await postToSlack(botToken, channel, payload);

  if (result.success) {
    console.log(`\n✅ Nightly notification sent to ${channel}`);
  } else if (result.channelNotFound) {
    console.warn(`\n⚠️ Channel ${channel} not found in Slack workspace`);
    console.warn('   This could mean:');
    console.warn('   - SLACK_NIGHTLY_CHANNEL is misconfigured');
    console.warn('   - The bot does not have access to the channel');
    console.warn('Skipping nightly Slack notification (non-critical)');
  } else {
    // Fail open - log the error but don't exit with error code
    console.log('\n⚠️ Nightly notification failed but continuing (non-critical)');
  }
}

// Run - fail open on errors (non-critical notification)
main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
  // Don't exit with error code - this is a non-critical notification
});
