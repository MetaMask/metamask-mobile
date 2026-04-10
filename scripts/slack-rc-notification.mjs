/**
 * Slack RC Build Notification Script
 *
 * Cherry-pick section: reads markdown from rc-cherry-pick-changelog.sh (written in CI by
 * scripts/write-rc-cherry-pick-changelog-merge-base.sh: --from merge-base(HEAD, origin/main),
 * --to HEAD). If that file is missing, falls back to CHANGELOG.md via @metamask/auto-changelog.
 *
 * Required: SEMVER, SLACK_BOT_TOKEN, IOS_BUILD_NUMBER, ANDROID_BUILD_NUMBER
 * Optional: RC_CHERRY_PICK_CHANGELOG_PATH (defaults to rc-cherry-pick-changelog.md in repo root)
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
// eslint-disable-next-line import-x/no-extraneous-dependencies
import { parseChangelog } from '@metamask/auto-changelog';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

const MAX_SLACK_CHANGELOG_CHARS = 2800;
const DEFAULT_CHERRY_PICK_FILE = 'rc-cherry-pick-changelog.md';

function resolvePath(p) {
  return isAbsolute(p) ? p : join(REPO_ROOT, p);
}

/**
 * Convert rc-cherry-pick-changelog.sh markdown to Slack mrkdwn.
 */
function cherryPickMarkdownToSlack(markdown) {
  const body = markdown.replace(/^##[^\n]*\n\n?/m, '').trim();
  if (
    !body ||
    /_No cherry-pick commits/i.test(body) ||
    /Could not find a previous bump/i.test(body) ||
    /range unavailable/i.test(body)
  ) {
    return { text: '', isEmpty: true };
  }

  const lines = body.split('\n').filter((line) => line.length > 0);
  const slackLines = [];

  for (const line of lines) {
    const prLink = line.match(/^-\s*\[#(\d+)\]\(([^)]+)\):\s*(.*)$/);
    if (prLink) {
      slackLines.push(`• <${prLink[2]}|#${prLink[1]}>: ${prLink[3]}`);
      continue;
    }
    const commitLink = line.match(/^-\s*\[`([^`]+)`\]\(([^)]+)\):\s*(.*)$/);
    if (commitLink) {
      slackLines.push(`• <${commitLink[2]}|\`${commitLink[1]}\`>: ${commitLink[3]}`);
      continue;
    }
    slackLines.push(line);
  }

  let text = slackLines.join('\n');
  if (text.length > MAX_SLACK_CHANGELOG_CHARS) {
    text = `${text.slice(0, MAX_SLACK_CHANGELOG_CHARS - 40)}\n_…truncated_`;
  }

  return { text, isEmpty: false };
}

/**
 * Load cherry-pick section from pre-generated file (CI artifact) if present.
 */
function loadCherryPickChangelogForSlack() {
  const pathEnv = process.env.RC_CHERRY_PICK_CHANGELOG_PATH || DEFAULT_CHERRY_PICK_FILE;
  const path = resolvePath(pathEnv);
  if (!existsSync(path)) {
    return null;
  }
  try {
    const markdown = readFileSync(path, 'utf8');
    const converted = cherryPickMarkdownToSlack(markdown);
    if (converted.isEmpty || !converted.text) {
      console.log(`\n📖 Cherry-pick file ${pathEnv} present but empty after filters; trying CHANGELOG.md`);
      return null;
    }
    console.log(`\n📖 Using cherry-pick changelog file: ${pathEnv}`);
    return converted;
  } catch (e) {
    console.warn(`⚠️ Could not read ${path}: ${e.message}`);
    return null;
  }
}

function extractChangelogEntries(version) {
  const changelogPath = join(REPO_ROOT, 'CHANGELOG.md');

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

function formatChangesForSlack(changes, maxEntries = 15) {
  const formattedEntries = [];

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

      let description = entry.description;

      if (entry.prNumbers && entry.prNumbers.length > 0) {
        const prLinks = entry.prNumbers
          .map((prNum) => `<${REPO_URL}/pull/${prNum}|#${prNum}>`)
          .join(', ');
        description = `${description} (${prLinks})`;
      }

      formattedEntries.push(`• ${description}`);
    }
  }

  const allEntriesCount = Object.values(changes)
    .flat()
    .filter(Boolean).length;
  const remaining = allEntriesCount - formattedEntries.length;

  if (remaining > 0) {
    formattedEntries.push(`\n_...and ${remaining} more changes_`);
  }

  return formattedEntries.join('\n');
}

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

function buildSlackMessage(options) {
  const {
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    changelogText,
    hasChangelog,
    changelogSource,
  } = options;

  const sectionTitle =
    changelogSource === 'cherry-pick'
      ? '*📋 Cherry-picks since last RC bump:*'
      : '*📋 What\'s in this RC:*';

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

  if (hasChangelog && changelogText) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${sectionTitle}\n${changelogText}`,
        },
      },
    );
  } else {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_No changelog entries found. See CHANGELOG.md or rc-cherry-pick-changelog output._',
      },
    });
  }

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
            text: `<${pipelineUrl}|View Build Pipeline> | <${REPO_URL}/blob/release/${version}/CHANGELOG.md|CHANGELOG.md>`,
          },
        ],
      },
    );
  }

  return {
    blocks,
    text: `🚀 Mobile RC Build v${version} (${buildNumber}) is ready!`,
  };
}

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

function getSlackChannel(version) {
  const formattedVersion = version.replace(/\./g, '-');
  return `#release-mobile-${formattedVersion}`;
}

async function main() {
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

  const testChannel = process.env.TEST_CHANNEL;
  const expectedChannelName = testChannel || getSlackChannel(version);
  const isTestMode = Boolean(testChannel);

  console.log(`\n📣 Preparing Slack notification for RC v${version} (${buildNumber})`);
  if (isTestMode) {
    console.log(`🧪 TEST MODE: Posting to override channel: ${expectedChannelName}`);
  } else {
    console.log(`📍 Target channel: ${expectedChannelName}`);
  }

  let changelogText = '';
  let hasChangelog = false;
  let changelogSource = 'none';

  const cherry = loadCherryPickChangelogForSlack();
  if (cherry && cherry.text) {
    changelogText = cherry.text;
    hasChangelog = true;
    changelogSource = 'cherry-pick';
  } else {
    console.log('\n📖 Reading CHANGELOG.md (no rc-cherry-pick-changelog.md in workspace)...');
    const changes = extractChangelogEntries(version);
    if (changes) {
      const totalChanges = Object.values(changes)
        .flat()
        .filter(Boolean).length;
      if (totalChanges > 0) {
        hasChangelog = true;
        changelogText = formatChangesForSlack(changes);
        changelogSource = 'changelog-md';
        console.log(`   Found ${totalChanges} changelog entries for v${version}`);
      }
    } else {
      console.log('   ⚠️ Could not read changelog');
    }
  }

  console.log('\n📤 Posting to Slack...');

  const payload = buildSlackMessage({
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    changelogText,
    hasChangelog,
    changelogSource,
  });

  const result = await postToSlack(botToken, expectedChannelName, payload);

  if (result.success) {
    console.log(`\n✅ RC notification sent to ${expectedChannelName}`);
  } else if (result.channelNotFound) {
    console.warn(`\n⚠️ Channel ${expectedChannelName} not found in Slack workspace`);
    console.warn('Skipping Slack notification (non-critical)');
  } else {
    console.log('\n⚠️ RC notification failed but continuing (non-critical)');
  }
}

main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
});
