/**
 * Slack RC Build Notification Script
 *
 * This script posts a notification to Slack after an RC build completes.
 * It reads the CHANGELOG.md using @metamask/auto-changelog to extract entries
 * for the current version and formats them into a Slack message with PR links.
 *
 * Required Environment Variables:
 *   - SEMVER: The semantic version (e.g., "7.40.0")
 *   - IOS_BUILD_NUMBER: iOS build number
 *   - ANDROID_BUILD_NUMBER: Android build number
 *   - SLACK_BOT_TOKEN: Slack Bot OAuth token for API calls
 *
 * Optional Environment Variables:
 *   - ANDROID_PUBLIC_URL: Public URL for Android APK download
 *   - IOS_PUBLIC_URL: Public URL for iOS build
 *   - BUILD_PIPELINE_URL: URL to the GitHub Actions pipeline
 *   - GITHUB_REPOSITORY: Repository in format "owner/repo"
 *   - TEST_CHANNEL: Override channel for testing (e.g., "#mm-test-channel")
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { parseChangelog } from '@metamask/auto-changelog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

/**
 * Extract changelog entries for a specific version using auto-changelog
 * @param {string} version - The version to extract entries for
 * @returns {Object|null} The release changes or null if not found
 */
function extractChangelogEntries(version) {
  const changelogPath = join(__dirname, '..', 'CHANGELOG.md');

  let changelogContent;
  try {
    changelogContent = readFileSync(changelogPath, 'utf8');
  } catch (error) {
    console.error(`Failed to read CHANGELOG.md: ${error.message}`);
    return null;
  }

  try {
    const changelog = parseChangelog({
      changelogContent,
      repoUrl: REPO_URL,
      shouldExtractPrLinks: true,
    });

    // Get changes for this specific version
    const releaseChanges = changelog.getReleaseChanges(version);

    if (!releaseChanges) {
      console.warn(`No release found for version ${version}`);
      return null;
    }

    return releaseChanges;
  } catch (error) {
    console.error(`Failed to parse CHANGELOG.md: ${error.message}`);
    return null;
  }
}

/**
 * Format changelog entries for Slack
 * @param {Object} changes - The changelog changes object
 * @param {number} maxEntries - Maximum entries to display
 * @returns {string} Formatted changelog text for Slack
 */
function formatChangesForSlack(changes, maxEntries = 15) {
  const formattedEntries = [];

  // Priority order for categories
  const categoryOrder = [
    'Added',
    'Fixed',
    'Changed',
    'Deprecated',
    'Removed',
    'Uncategorized',
  ];

  for (const category of categoryOrder) {
    const entries = changes[category] || [];
    for (const entry of entries) {
      if (formattedEntries.length >= maxEntries) {
        break;
      }

      // Build description with PR links
      let description = entry.description;

      // If we have PR numbers from auto-changelog, format them for Slack
      if (entry.prNumbers && entry.prNumbers.length > 0) {
        const prLinks = entry.prNumbers
          .map((prNum) => `<${REPO_URL}/pull/${prNum}|#${prNum}>`)
          .join(', ');
        description = `${description} (${prLinks})`;
      }

      formattedEntries.push(`• ${description}`);
    }
  }

  // Count remaining entries
  const allEntriesCount = Object.values(changes)
    .flat()
    .filter(Boolean).length;
  const remaining = allEntriesCount - formattedEntries.length;

  if (remaining > 0) {
    formattedEntries.push(`\n_...and ${remaining} more changes_`);
  }

  return formattedEntries.join('\n');
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
 * @returns {Object} Slack message payload
 */
function buildSlackMessage(options) {
  const {
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    changelogText,
    hasChangelog,
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

  // Add changelog section if we have entries
  if (hasChangelog && changelogText) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 What's in this RC:*\n${changelogText}`,
        },
      },
    );
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_No changelog entries found for this version. Check CHANGELOG.md_',
      },
    });
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
            text: `<${pipelineUrl}|View Build Pipeline> | <${REPO_URL}/blob/release/${version}/CHANGELOG.md|View Full Changelog>`,
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
  // Validate required environment variables (fail open - just log and return)
  const requiredEnvVars = ['SEMVER', 'SLACK_BOT_TOKEN'];
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

  // TEST_CHANNEL allows overriding the channel for local testing
  const testChannel = process.env.TEST_CHANNEL;
  const expectedChannelName = testChannel || getSlackChannel(version);
  const isTestMode = Boolean(testChannel);

  console.log(`\n📣 Preparing Slack notification for RC v${version} (${buildNumber})`);
  if (isTestMode) {
    console.log(`🧪 TEST MODE: Posting to override channel: ${expectedChannelName}`);
  } else {
    console.log(`📍 Target channel: ${expectedChannelName}`);
  }

  // Extract changelog entries using auto-changelog
  console.log('\n📖 Reading CHANGELOG.md...');
  const changes = extractChangelogEntries(version);

  let changelogText = '';
  let hasChangelog = false;

  if (changes) {
    const totalChanges = Object.values(changes)
      .flat()
      .filter(Boolean).length;
    console.log(`   Found ${totalChanges} changelog entries for v${version}`);

    if (totalChanges > 0) {
      hasChangelog = true;
      changelogText = formatChangesForSlack(changes);
    }
  } else {
    console.log('   ⚠️ Could not read changelog');
  }

  // Build and send the message
  console.log('\n📤 Posting to Slack...');

  const payload = buildSlackMessage({
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    changelogText,
    hasChangelog,
  });

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

