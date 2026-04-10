/**
 * Slack RC Build Notification Script
 *
 * Posts a Slack message after an RC build. The *What's in this RC* block lists
 * commits from **git history** (merge-base + ancestry path).
 *
 * Algorithm:
 *   - Run `git merge-base <headRef> <baseRef>` (default **headRef**: `HEAD`, override with
 *     `HEAD_REF`; default **baseRef**: `origin/main`, override with `MERGE_BASE_REF`) to get
 *     the fork point as a **merge-base commit hash**.
 *   - List commits on the fork-to-tip path only:
 *     `git log --ancestry-path <merge-base-hash>..<headRef>` (same full hash from `git merge-base`; output uses short hash + subject), with optional
 *     PR links from `#123` / `(#123)` in subjects.
 *   - Omit commits whose subject starts with `[skip ci] Bump version number to` (automation noise).
 *   - Cap the list (see `MAX_RC_COMMIT_LINES`) and append *…and N more* when needed.
 *
 * **Fail-open:** If merge-base fails, `git log` errors, or the ancestry path is empty,
 * the notification is still sent: *What's in this RC* is omitted in favor of a short
 * fallback with a link to release notes on GitHub when needed. The process exits 0;
 * git problems are logged to stderr. This matches CI/local use where shallow clones or
 * missing refs can make history unavailable.
 *
 * Required environment variables:
 *   - SEMVER: Semantic version (e.g. "7.40.0")
 *   - IOS_BUILD_NUMBER: iOS build number
 *   - ANDROID_BUILD_NUMBER: Android build number
 *   - SLACK_BOT_TOKEN: Slack Bot OAuth token for API calls
 *
 * Optional environment variables:
 *   - ANDROID_PUBLIC_URL: Public URL for Android APK download
 *   - IOS_PUBLIC_URL: Public URL for iOS build
 *   - BUILD_PIPELINE_URL: GitHub Actions pipeline URL (footer: pipeline + release notes link)
 *   - GITHUB_REPOSITORY: "owner/repo" (defaults to metamask-mobile)
 *   - MERGE_BASE_REF: Ref for merge-base (default: origin/main)
 *   - HEAD_REF: Tip ref for `git merge-base` and `git log` range (default: `HEAD`; e.g. a
 *     branch name or SHA to preview another tip without checking it out)
 *   - SLACK_RC_NOTIFICATION_DRY_RUN: Set to `1` or `true` to print the message JSON and
 *     exit without calling Slack (`SLACK_BOT_TOKEN` not required in this mode)
 */

import { execFileSync } from 'child_process';

// Configuration
const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

const MAX_RC_COMMIT_LINES = 20;

/** Commits whose subject starts with this (version bump automation) are omitted from the RC list. */
const SKIP_CI_BUMP_VERSION_SUBJECT = /^\[skip ci\] Bump version number to/;

/**
 * Run `git merge-base` and return the merge-base **commit hash**, or `null` if git errors
 * or output is empty (fail-open: caller skips the RC commit list).
 * @param {string} headRef
 * @param {string} baseRef
 * @returns {string|null} Merge-base commit hash (hex string from `git merge-base`), or `null` on failure
 */
function getMergeBase(headRef, baseRef) {
  try {
    const out = execFileSync('git', ['merge-base', headRef, baseRef], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const sha = out.trim();
    return sha || null;
  } catch (error) {
    console.error(
      `[slack-rc-notification] git merge-base ${headRef} ${baseRef} failed (RC commit list skipped): ${error.message}`,
    );
    return null;
  }
}

/**
 * @param {string} mergeBaseCommitHash - Commit hash returned by `git merge-base` (common ancestor of `headRef` and the base ref)
 * @param {string} headRef - Tip ref (default in callers: `HEAD`, overridable via `HEAD_REF`)
 * @returns {string[]} Raw `hash\\tsubject` lines from `git log --ancestry-path` from merge-base to `headRef`,
 *   excluding `[skip ci] Bump version number to …` subjects; empty array if no commits or if git fails (fail-open).
 */
function getAncestryPathLogLines(mergeBaseCommitHash, headRef) {
  try {
    const out = execFileSync(
      'git',
      ['log', '--ancestry-path', `${mergeBaseCommitHash}..${headRef}`, '--pretty=format:%h\t%s'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    if (!out.trim()) {
      return [];
    }
    return out
      .trim()
      .split('\n')
      .filter((line) => {
        const tab = line.indexOf('\t');
        const subject = tab >= 0 ? line.slice(tab + 1) : line;
        return !SKIP_CI_BUMP_VERSION_SUBJECT.test(subject.trim());
      });
  } catch (error) {
    console.error(
      `[slack-rc-notification] git log --ancestry-path failed (RC commit list skipped): ${error.message}`,
    );
    return [];
  }
}

/**
 * Link (#123) and standalone #123 in a commit subject to the repo PR URL (Slack mrkdwn).
 * @param {string} subject
 * @returns {string}
 */
function formatSubjectWithPrLinks(subject) {
  let result = subject;
  result = result.replace(/\(#(\d+)\)/g, (_, n) => `(<${REPO_URL}/pull/${n}|#${n}>)`);
  result = result.replace(/(^|\s)#(\d+)\b/g, (_, lead, n) => `${lead}<${REPO_URL}/pull/${n}|#${n}>`);
  return result;
}

/**
 * Format one `hash\\tsubject` log line for Slack (bullet, short hash, subject with PR links).
 * @param {string} line
 * @returns {string}
 */
function formatCommitLineForSlack(line) {
  const tab = line.indexOf('\t');
  const hash = tab >= 0 ? line.slice(0, tab) : '';
  const subject = tab >= 0 ? line.slice(tab + 1) : line;
  const linked = formatSubjectWithPrLinks(subject);
  return `• \`${hash}\` ${linked}`;
}

/**
 * Build Slack mrkdwn for RC commits (capped) and optional "...and N more" line.
 * @param {string[]} logLines - Full list of hash\\tsubject lines
 * @param {number} maxEntries
 * @returns {{ text: string, hasEntries: boolean }}
 */
function formatCommitsForSlack(logLines, maxEntries = MAX_RC_COMMIT_LINES) {
  if (!logLines.length) {
    return { text: '', hasEntries: false };
  }

  const slice = logLines.slice(0, maxEntries);
  const remaining = logLines.length - slice.length;
  const bullets = slice.map(formatCommitLineForSlack);
  if (remaining > 0) {
    bullets.push(`\n_...and ${remaining} more_`);
  }
  return { text: bullets.join('\n'), hasEntries: true };
}

/**
 * Resolve merge-base with `MERGE_BASE_REF` (default `origin/main`) and collect commits
 * via `git log --ancestry-path`.
 * @returns {{ text: string, hasEntries: boolean }} Slack mrkdwn and whether to show the RC list
 */
function extractRcCommitsFromGit() {
  const baseRef = process.env.MERGE_BASE_REF ?? 'origin/main';
  const headRef = (process.env.HEAD_REF ?? '').trim() || 'HEAD';
  console.log(`\n📖 Git history (merge-base ${headRef} with ${baseRef}, ancestry-path to ${headRef})...`);

  const mergeBase = getMergeBase(headRef, baseRef);
  if (!mergeBase) {
    console.warn(
      '   Could not resolve merge-base; skipping “What’s in this RC” (Slack will show fallback + release notes link when available)',
    );
    return { text: '', hasEntries: false };
  }
  console.log(`   merge-base: ${mergeBase}`);

  const logLines = getAncestryPathLogLines(mergeBase, headRef);
  if (!logLines.length) {
    console.warn(
      '   No commits on ancestry path; skipping “What’s in this RC” (Slack will show fallback + release notes link when available)',
    );
    return { text: '', hasEntries: false };
  }

  console.log(`   Found ${logLines.length} commit(s) on ancestry path`);
  return formatCommitsForSlack(logLines);
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
    rcCommitsText,
    hasRcCommits,
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

  // Add RC commit list if we have entries
  if (hasRcCommits && rcCommitsText) {
    blocks.push(
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📋 What's in this RC:*\n${rcCommitsText}`,
        },
      },
    );
  } else {
    const releaseNotesMrkdwn = `<${REPO_URL}/tree/release/${version}|View release notes>`;
    const fallbackMrkdwn = pipelineUrl
      ? `_Could not list RC commits (empty ancestry path, merge-base failed, incomplete git history, or \`git log\` failed). For full notes see ${releaseNotesMrkdwn} — also linked in the footer below._`
      : `_Could not list RC commits (empty ancestry path, merge-base failed, incomplete git history, or \`git log\` failed). For full notes see ${releaseNotesMrkdwn}._`;
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: fallbackMrkdwn,
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

  const expectedChannelName = getSlackChannel(version);

  console.log(`\n📣 Preparing Slack notification for RC v${version} (${buildNumber})`);
  if (isDryRun) {
    console.log('🧪 DRY RUN: will print payload JSON and not call Slack');
  } else {
    console.log(`📍 Target channel: ${expectedChannelName}`);
  }

  const { text: rcCommitsText, hasEntries: hasRcCommits } = extractRcCommitsFromGit();

  // Build and send the message
  console.log('\n📤 Posting to Slack...');

  const payload = buildSlackMessage({
    version,
    buildNumber,
    androidUrl,
    iosUrl,
    pipelineUrl,
    rcCommitsText,
    hasRcCommits,
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
