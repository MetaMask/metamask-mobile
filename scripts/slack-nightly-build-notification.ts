#!/usr/bin/env ts-node
/**
 * Nightly Build Slack Notification
 *
 * Replaces the old Slack Workflow Builder automation ("Nightly Builds from
 * main branch available", posted daily since September 12th) with a message
 * built from the actual nightly-build.yml run: real build numbers, real
 * app versions, and — unlike the old automation — the exact commit each
 * build was cut from and a link to the GitHub Actions run that produced it,
 * so testers can tell what they're actually testing.
 *
 * Reads nightly-build-metadata.json (written by the `collect-metadata` job
 * in nightly-build.yml) and posts one Block Kit message with a Main RC
 * section and a Main EXP section, each covering Android + iOS. When the
 * metadata of earlier nightly runs is available, each build also links to a
 * GitHub compare of the changes since the last successful nightly of that
 * same build.
 *
 * Required env: SLACK_BOT_TOKEN, SLACK_CHANNEL_ID (not required in dry run)
 * Optional env: NIGHTLY_BUILD_METADATA_PATH (default nightly-build-metadata.json),
 * PREVIOUS_NIGHTLY_METADATA_DIR (default previous-nightly-metadata; one
 * subdirectory per earlier run, each holding its nightly-build-metadata.json),
 * PREVIOUS_NIGHTLY_SHA (compare base when no earlier metadata covers a build),
 * RUNWAY_NIGHTLY_ANDROID_RC_URL, RUNWAY_NIGHTLY_ANDROID_EXP_URL,
 * RUNWAY_NIGHTLY_IOS_RC_URL, RUNWAY_NIGHTLY_IOS_EXP_URL,
 * GITHUB_REPOSITORY (default MetaMask/metamask-mobile),
 * SLACK_NIGHTLY_NOTIFICATION_DRY_RUN
 */

import fs from 'fs';

const DEFAULT_METADATA_PATH = 'nightly-build-metadata.json';
const DEFAULT_PREVIOUS_METADATA_DIR = 'previous-nightly-metadata';

const DEFAULT_REPO_URL = `https://github.com/${process.env.GITHUB_REPOSITORY || 'MetaMask/metamask-mobile'}`;

// Public TestFlight link for the external testing group used by nightly iOS
// builds — same link the old Slack automation hardcoded.
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/hBrjtFuA';

const LAUNCHDARKLY_FLAGS_URL =
  'https://app.launchdarkly.com/projects/metamask-client-config-api-mobile/flags?env=production&env=qa-prod&env=test&env=main-exp&env=main-test&env=main-beta&env=qa-dev&env=flask-dev&env=flask-prod';
const LAUNCHDARKLY_RC_URL = `${LAUNCHDARKLY_FLAGS_URL}&selected-env=qa-prod`;
const LAUNCHDARKLY_EXP_URL = `${LAUNCHDARKLY_FLAGS_URL}&selected-env=main-exp`;

export interface BuildEntry {
  /** GitHub Actions job `result`: success | failure | cancelled | skipped (null if unknown). */
  result: string | null;
  /** package.json semantic version at the built commit (e.g. "7.80.0"). */
  version: string | null;
  /** Platform build number (Android versionCode / iOS CURRENT_PROJECT_VERSION). */
  build_number: string | null;
  /** Commit SHA actually built — each job checks out `main` independently, so this can differ between builds. */
  commit_sha: string | null;
}

export interface NightlyBuildMetadata {
  run_id: string;
  run_url: string;
  /** `github.sha` at the time nightly-build.yml was triggered — not necessarily what every job built, see BuildEntry.commit_sha. */
  triggered_sha: string;
  generated_at: string;
  builds: {
    'ios-exp': BuildEntry;
    'ios-rc': BuildEntry;
    'android-exp': BuildEntry;
    'android-rc': BuildEntry;
  };
}

export type BuildKey = keyof NightlyBuildMetadata['builds'];

/** Commit SHA each build is compared against, keyed by build. */
export type PreviousCommits = Partial<Record<BuildKey, string>>;

const BUILD_KEYS: BuildKey[] = ['ios-exp', 'ios-rc', 'android-exp', 'android-rc'];

export interface RunwayLinks {
  androidRcUrl?: string;
  androidExpUrl?: string;
  iosRcUrl?: string;
  iosExpUrl?: string;
}

export interface NightlySlackMessageOptions {
  /** Defaults to DEFAULT_REPO_URL; overridable for tests. */
  repoUrl?: string;
  /** Builds without an entry get no "changes since last nightly" link. */
  previousCommits?: PreviousCommits;
}

interface SlackPayload {
  blocks: object[];
  text: string;
}

const EMPTY_BUILD_ENTRY: BuildEntry = {
  result: null,
  version: null,
  build_number: null,
  commit_sha: null,
};

/**
 * Loads and normalizes nightly-build-metadata.json, defaulting any missing
 * build entry to EMPTY_BUILD_ENTRY instead of throwing — a build that never
 * ran (e.g. a cancelled workflow) should still produce a postable message.
 */
export function loadMetadata(path: string): NightlyBuildMetadata {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  const builds = parsed.builds ?? {};
  return {
    run_id: parsed.run_id ?? '',
    run_url: parsed.run_url ?? '',
    triggered_sha: parsed.triggered_sha ?? '',
    generated_at: parsed.generated_at ?? new Date().toISOString(),
    builds: {
      'ios-exp': builds['ios-exp'] ?? EMPTY_BUILD_ENTRY,
      'ios-rc': builds['ios-rc'] ?? EMPTY_BUILD_ENTRY,
      'android-exp': builds['android-exp'] ?? EMPTY_BUILD_ENTRY,
      'android-rc': builds['android-rc'] ?? EMPTY_BUILD_ENTRY,
    },
  };
}

/**
 * Loads the metadata of earlier nightly runs from `dir/<run id>/nightly-build-metadata.json`,
 * newest first. Unreadable or missing entries are skipped, since the compare
 * link is optional.
 */
export function loadPreviousMetadata(dir: string): NightlyBuildMetadata[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const previous: NightlyBuildMetadata[] = [];
  for (const entry of fs.readdirSync(dir)) {
    const path = `${dir}/${entry}/${DEFAULT_METADATA_PATH}`;
    if (!fs.existsSync(path)) {
      continue;
    }
    try {
      previous.push(loadMetadata(path));
    } catch (error) {
      console.warn(`⚠️ Skipping unreadable previous metadata at ${path}: ${(error as Error).message}`);
    }
  }
  return previous.sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at));
}

/**
 * For each build, picks the commit of the most recent earlier nightly where
 * that same build succeeded, so a failed build last night still compares
 * against the build testers actually installed. Falls back to `fallbackSha`
 * when none of the earlier runs covers the build.
 */
export function resolvePreviousCommits(
  previous: NightlyBuildMetadata[],
  currentRunId: string,
  fallbackSha?: string,
): PreviousCommits {
  const earlier = previous.filter((run) => run.run_id !== currentRunId);
  const commits: PreviousCommits = {};
  for (const key of BUILD_KEYS) {
    const match = earlier.find((run) => isSuccess(run.builds[key]) && run.builds[key].commit_sha);
    const sha = match?.builds[key].commit_sha ?? fallbackSha;
    if (sha) {
      commits[key] = sha;
    }
  }
  return commits;
}

/**
 * Check if a URL is valid (mirrors scripts/slack-rc-notification.mjs's isValidUrl).
 */
function isValidUrl(url: string | undefined): boolean {
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

function resolveLink(url: string | undefined, label: string): string {
  return isValidUrl(url) ? `<${url}|${label}>` : `_${label} link not configured_`;
}

function shortSha(sha: string | null): string {
  return sha ? sha.slice(0, 7) : 'unknown';
}

function commitLink(repoUrl: string, sha: string | null): string {
  if (!sha) {
    return '_commit unknown_';
  }
  return `<${repoUrl}/commits/${sha}/|${shortSha(sha)}>`;
}

function compareLink(repoUrl: string, previousSha: string | undefined, sha: string | null): string | null {
  if (!previousSha || !sha) {
    return null;
  }
  if (previousSha === sha) {
    return '_No changes since last nightly_';
  }
  return `<${repoUrl}/compare/${previousSha}...${sha}|Changes since last nightly>`;
}

function versionLine(entry: BuildEntry): string {
  const version = entry.version ? `v${entry.version}` : 'version unknown';
  const buildNumber = entry.build_number ?? 'unknown';
  return `${version} (build ${buildNumber})`;
}

function isSuccess(entry: BuildEntry): boolean {
  return entry.result === 'success';
}

interface PlatformBuild {
  title: string;
  entry: BuildEntry;
  /** Download links shown before the commit link, e.g. Runway and TestFlight. */
  downloadLinks: string[];
  previousSha: string | undefined;
}

function platformFieldText({ title, entry, downloadLinks, previousSha }: PlatformBuild, repoUrl: string): string {
  if (!isSuccess(entry)) {
    return `*${title}*\n:warning: build ${entry.result ?? 'did not run'}`;
  }
  const lines = [
    `*${title}*`,
    versionLine(entry),
    [...downloadLinks, `commit ${commitLink(repoUrl, entry.commit_sha)}`].join(' • '),
  ];
  const compare = compareLink(repoUrl, previousSha, entry.commit_sha);
  if (compare) {
    lines.push(compare);
  }
  return lines.join('\n');
}

function buildChannelBlocks(
  label: string,
  ldFlag: string,
  ldUrl: string,
  android: PlatformBuild,
  ios: PlatformBuild,
  repoUrl: string,
): object[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${label} Links (LD Flag <${ldUrl}|${ldFlag}>)*`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: platformFieldText(android, repoUrl) },
        { type: 'mrkdwn', text: platformFieldText(ios, repoUrl) },
      ],
    },
  ];
}

/**
 * Slack's special date token renders in each reader's own timezone, same
 * end result as the old Workflow Builder's `time.format(...)` variable.
 * Falls back to the raw ISO timestamp as plain text if generated_at can't
 * be parsed, instead of posting a broken `<!date^NaN^...>` token.
 */
function formatDateBlock(generatedAtIso: string): string {
  const unixSeconds = Math.floor(new Date(generatedAtIso).getTime() / 1000);
  if (!Number.isFinite(unixSeconds)) {
    return generatedAtIso;
  }
  return `<!date^${unixSeconds}^{date_long_pretty} at {time}|${generatedAtIso}>`;
}

/**
 * Build the Slack message payload for a nightly build run.
 */
export function buildNightlySlackMessage(
  metadata: NightlyBuildMetadata,
  links: RunwayLinks = {},
  options: NightlySlackMessageOptions = {},
): SlackPayload {
  const repoUrl = options.repoUrl || DEFAULT_REPO_URL;
  const previousCommits = options.previousCommits ?? {};
  const headerText = ':iphone: :rocketship: Nightly Builds from main branch available';
  const testFlightLink = `<${TESTFLIGHT_URL}|TestFlight>`;
  const android = (key: BuildKey, runwayUrl: string | undefined): PlatformBuild => ({
    title: ':android: Android',
    entry: metadata.builds[key],
    downloadLinks: [resolveLink(runwayUrl, 'Download')],
    previousSha: previousCommits[key],
  });
  const ios = (key: BuildKey, runwayUrl: string | undefined): PlatformBuild => ({
    title: ':mac_apple: iOS',
    entry: metadata.builds[key],
    downloadLinks: [resolveLink(runwayUrl, 'Download'), testFlightLink],
    previousSha: previousCommits[key],
  });

  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText, emoji: true },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: metadata.run_url
            ? `${formatDateBlock(metadata.generated_at)} • <${metadata.run_url}|View workflow run>`
            : formatDateBlock(metadata.generated_at),
        },
      ],
    },
    { type: 'divider' },
    ...buildChannelBlocks(
      ':package: Main RC',
      'main-rc',
      LAUNCHDARKLY_RC_URL,
      android('android-rc', links.androidRcUrl),
      ios('ios-rc', links.iosRcUrl),
      repoUrl,
    ),
    { type: 'divider' },
    ...buildChannelBlocks(
      ':test_tube: Main EXP',
      'main-exp',
      LAUNCHDARKLY_EXP_URL,
      android('android-exp', links.androidExpUrl),
      ios('ios-exp', links.iosExpUrl),
      repoUrl,
    ),
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Note: These builds are not associated with releases. Triggered from commit ${commitLink(repoUrl, metadata.triggered_sha)}.`,
        },
      ],
    },
  ];

  return { blocks, text: headerText };
}

async function postToSlack(
  botToken: string,
  channelId: string,
  payload: SlackPayload,
): Promise<{ success: boolean }> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: channelId,
        blocks: payload.blocks,
        text: payload.text,
        unfurl_links: false,
        unfurl_media: false,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    console.log('✅ Slack notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to post to Slack: ${(error as Error).message}`);
    return { success: false };
  }
}

/** Throws if `value` is nullish — used once required env vars have already been validated present. */
function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} was required but missing at this point`);
  return value;
}

export async function main(): Promise<void> {
  const dryRunEnv = process.env.SLACK_NIGHTLY_NOTIFICATION_DRY_RUN;
  const isDryRun = dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';

  const requiredEnvVars = isDryRun ? [] : ['SLACK_BOT_TOKEN', 'SLACK_CHANNEL_ID'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const metadataPath = process.env.NIGHTLY_BUILD_METADATA_PATH || DEFAULT_METADATA_PATH;
  if (!fs.existsSync(metadataPath)) {
    console.warn(`⚠️ Metadata file not found at ${metadataPath}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const metadata = loadMetadata(metadataPath);

  const links: RunwayLinks = {
    androidRcUrl: process.env.RUNWAY_NIGHTLY_ANDROID_RC_URL,
    androidExpUrl: process.env.RUNWAY_NIGHTLY_ANDROID_EXP_URL,
    iosRcUrl: process.env.RUNWAY_NIGHTLY_IOS_RC_URL,
    iosExpUrl: process.env.RUNWAY_NIGHTLY_IOS_EXP_URL,
  };

  const previousCommits = resolvePreviousCommits(
    loadPreviousMetadata(process.env.PREVIOUS_NIGHTLY_METADATA_DIR || DEFAULT_PREVIOUS_METADATA_DIR),
    metadata.run_id,
    process.env.PREVIOUS_NIGHTLY_SHA || undefined,
  );

  const payload = buildNightlySlackMessage(metadata, links, { previousCommits });

  if (isDryRun) {
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify({ channel: process.env.SLACK_CHANNEL_ID || null, ...payload }, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  const result = await postToSlack(
    requireEnv(process.env.SLACK_BOT_TOKEN, 'SLACK_BOT_TOKEN'),
    requireEnv(process.env.SLACK_CHANNEL_ID, 'SLACK_CHANNEL_ID'),
    payload,
  );

  if (!result.success) {
    console.log('⚠️ Slack notification failed but continuing (non-critical)');
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  // Fail open on errors: a Slack notification is never critical enough to
  // fail the workflow over.
  main().catch((error) => {
    console.error('⚠️ Unexpected error (non-critical):', error);
  });
}
