#!/usr/bin/env node

/**
 * Posts an app-profiling analysis summary to Slack.
 *
 * A bot cannot post into a DM conversation it is not part of, so a personal
 * `D...` conversation id taken from the Slack client fails with
 * `channel_not_found`. Pass a user id (`U.../W...`) instead and this opens the
 * bot's own DM with that user first.
 *
 * Usage:
 *   node .github/scripts/qa-automation/performance-tests/post-app-profiling-slack.mjs \
 *     <path-to-markdown>
 *
 * Environment:
 *   SLACK_BOT_TOKEN   required
 *   SLACK_TARGET      user id (U.../W...) or channel id (C.../G...)
 *   GITHUB_RUN_URL    optional footer link
 *   GITHUB_RUN_LABEL  optional footer link text, so a failure notice can say
 *                     what it links to instead of a generic "GitHub run"
 */

import fs from 'fs';

const SLACK_API = 'https://slack.com/api';
/** Slack rejects text over 40k; leave room for the footer. */
const MAX_TEXT_LENGTH = 38_000;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function slackApi(method, token, payload, { fetchFn = fetch } = {}) {
  const response = await fetchFn(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Slack ${method} HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body.ok) {
    throw new Error(`Slack ${method} failed: ${body.error || 'unknown error'}`);
  }
  return body;
}

function isUserId(target) {
  return /^[UW][A-Z0-9]+$/.test(String(target || ''));
}

/**
 * Opens the bot's own DM with a user. Needs `im:write`, which the token may
 * not carry, so callers treat a failure here as non-fatal and fall back to
 * addressing the user id directly.
 */
async function openDirectMessage(target, token, options = {}) {
  const body = await slackApi(
    'conversations.open',
    token,
    { users: target },
    options,
  );
  const channelId = body.channel?.id;
  if (!channelId) {
    throw new Error(`conversations.open returned no channel for ${target}`);
  }
  return channelId;
}

function buildText(markdown, runUrl, runLabel = 'GitHub run') {
  let text = String(markdown || '').trim();
  if (text.length > MAX_TEXT_LENGTH) {
    text = `${text.slice(0, MAX_TEXT_LENGTH)}\n_Truncated for Slack._`;
  }
  if (runUrl) {
    text = `${text}\n<${runUrl}|${runLabel || 'GitHub run'}>`;
  }
  return text;
}

async function post(channel, text, token, options) {
  const body = await slackApi(
    'chat.postMessage',
    token,
    {
      channel,
      text,
      unfurl_links: false,
      unfurl_media: false,
    },
    options,
  );
  return { channel, ts: body.ts };
}

/**
 * Posts the summary, addressing a user id directly first because that only
 * needs `chat:write`. Opening the DM explicitly needs the extra `im:write`
 * scope, so it is a fallback rather than the default path.
 */
async function postSummary(
  { markdown, target, token, runUrl, runLabel },
  options = {},
) {
  const text = buildText(markdown, runUrl, runLabel);

  try {
    return await post(target, text, token, options);
  } catch (error) {
    if (!isUserId(target)) {
      throw error;
    }
    console.log(
      `Direct post to ${target} failed (${error.message}); opening a DM instead`,
    );
  }

  const channel = await openDirectMessage(target, token, options);
  return post(channel, text, token, options);
}

async function main() {
  const [markdownPath] = process.argv.slice(2);
  const token = process.env.SLACK_BOT_TOKEN;
  const target = process.env.SLACK_TARGET;

  if (!markdownPath) {
    fail('Usage: post-app-profiling-slack.mjs <path-to-markdown>');
  }
  if (!token) {
    fail('SLACK_BOT_TOKEN is not set');
  }
  if (!target) {
    fail('SLACK_TARGET is not set');
  }
  if (!fs.existsSync(markdownPath)) {
    console.log(`No summary at ${markdownPath}; nothing to post`);
    return;
  }

  const result = await postSummary({
    markdown: fs.readFileSync(markdownPath, 'utf8'),
    target,
    token,
    runUrl: process.env.GITHUB_RUN_URL,
    runLabel: process.env.GITHUB_RUN_LABEL,
  });
  console.log(`✅ Slack message sent to ${result.channel} (ts=${result.ts})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

export { isUserId, openDirectMessage, buildText, postSummary };
