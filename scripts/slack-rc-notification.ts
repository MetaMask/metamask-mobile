#!/usr/bin/env ts-node

/**
 * Slack RC Build Notification Script
 *
 * This script posts a notification to Slack after an RC build completes.
 * It reads the CHANGELOG.md using @metamask/auto-changelog to extract entries
 * for the current version and formats them into a Slack message with PR links.
 *
 * The script uses the Slack Web API to:
 * 1. Find the release channel by name pattern (#release-mobile-{version})
 * 2. Post the RC build notification if the channel exists
 * 3. Gracefully log if the channel doesn't exist (fail open)
 *
 * Required Environment Variables:
 *   - SEMVER: The semantic version (e.g., "7.40.0")
 *   - BUILD_NUMBER: The build number
 *   - SLACK_BOT_TOKEN: Slack Bot OAuth token for API calls
 *
 * Optional Environment Variables:
 *   - ANDROID_PUBLIC_URL: Public URL for Android APK download
 *   - IOS_PUBLIC_URL: Public URL for iOS build
 *   - BITRISE_PIPELINE_URL: URL to the Bitrise pipeline
 *   - GITHUB_REPOSITORY: Repository in format "owner/repo"
 */

import { readFileSync } from 'fs';
import { join } from 'path';
// @ts-ignore - module is installed as devDependency, types may not resolve in all environments
// eslint-disable-next-line import/no-extraneous-dependencies
import { parseChangelog } from '@metamask/auto-changelog';

// Types - matching auto-changelog's internal Change type
interface Change {
  description: string;
  prNumbers: string[];
}

type ChangeCategory = 'Added' | 'Changed' | 'Fixed' | 'Deprecated' | 'Removed' | 'Uncategorized';

type ReleaseChanges = Partial<Record<ChangeCategory, Change[]>>;

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

interface SlackPayload {
  blocks: SlackBlock[];
  text: string;
}

interface SlackPostMessageResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}

interface MessageOptions {
  version: string;
  buildNumber: string;
  androidUrl?: string;
  iosUrl?: string;
  bitriseUrl?: string;
  changelogText: string;
  hasChangelog: boolean;
}

// Configuration
const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

/**
 * Extract changelog entries for a specific version using auto-changelog
 */
function extractChangelogEntries(version: string): ReleaseChanges | null {
  const changelogPath = join(__dirname, '..', 'CHANGELOG.md');

  let changelogContent: string;
  try {
    changelogContent = readFileSync(changelogPath, 'utf8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read CHANGELOG.md: ${errorMessage}`);
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

    return releaseChanges as ReleaseChanges;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to parse CHANGELOG.md: ${errorMessage}`);
    return null;
  }
}

/**
 * Format changelog entries for Slack
 */
function formatChangesForSlack(changes: ReleaseChanges, maxEntries = 15): string {
  const formattedEntries: string[] = [];

  // Priority order for categories
  const categoryOrder: ChangeCategory[] = [
    'Added',
    'Fixed',
    'Changed',
    'Deprecated',
    'Removed',
    'Uncategorized',
  ];

  const categoryEmojis: Record<ChangeCategory, string> = {
    Added: '✨',
    Fixed: '🐛',
    Changed: '🔄',
    Deprecated: '⚠️',
    Removed: '🗑️',
    Uncategorized: '📝',
  };

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

      formattedEntries.push(`${categoryEmojis[category] || '•'} ${description}`);
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
 * Build the Slack message payload
 */
function buildSlackMessage(options: MessageOptions): SlackPayload {
  const {
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    bitriseUrl,
    changelogText,
    hasChangelog,
  } = options;

  const blocks: SlackBlock[] = [
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
          text: androidUrl
            ? `*Android APK:*\n<${androidUrl}|Download>`
            : '*Android APK:*\n_Not available_',
        },
        {
          type: 'mrkdwn',
          text: iosUrl
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

  // Add Bitrise link
  if (bitriseUrl) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<${bitriseUrl}|View Bitrise Pipeline> | <${REPO_URL}/blob/release/${version}/CHANGELOG.md|View Full Changelog>`,
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
 * Posts directly using channel name - Slack will resolve it
 * Returns: { success: boolean, channelNotFound: boolean }
 */
async function postToSlack(
  botToken: string,
  channelName: string,
  payload: SlackPayload,
): Promise<{ success: boolean; channelNotFound: boolean }> {
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

    const data: SlackPostMessageResponse = await response.json();

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to post to Slack: ${errorMessage}`);
    return { success: false, channelNotFound: false };
  }
}

/**
 * Get the Slack channel name for a release version
 */
function getSlackChannel(version: string): string {
  const formattedVersion = version.replace(/\./g, '-');
  return `#release-mobile-${formattedVersion}`;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Validate required environment variables (fail open - just log and return)
  const requiredEnvVars = ['SEMVER', 'BUILD_NUMBER', 'SLACK_BOT_TOKEN'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const version = process.env.SEMVER!;
  const buildNumber = process.env.BUILD_NUMBER!;
  const androidUrl = process.env.ANDROID_PUBLIC_URL;
  const iosUrl = process.env.IOS_PUBLIC_URL;
  const bitriseUrl = process.env.BITRISE_PIPELINE_URL;
  const botToken = process.env.SLACK_BOT_TOKEN!;

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
    bitriseUrl,
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
