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
import path from 'path';
import {
  listRunArtifacts,
  linkScenarioNames,
  readManifest,
  scenarioDownloadMap,
} from './link-scenario-artifacts.mjs';

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
  if (runUrl) {
    text = `${text}\n<${runUrl}|${runLabel || 'GitHub run'}>`;
  }
  return text;
}

/**
 * Slack rejects a single chat.postMessage over 40k characters. Split on
 * blank lines instead of cutting mid-sentence. A paragraph longer than the
 * budget is split on newlines, then hard-sliced only as a last resort so
 * nothing is dropped.
 */
function splitForSlack(markdown, maxLength = MAX_TEXT_LENGTH) {
  const text = String(markdown || '').trim();
  if (text.length === 0) {
    return [''];
  }
  if (text.length <= maxLength) {
    return [text];
  }

  const parts = [];
  let current = '';
  const append = (chunk) => {
    const next = current ? `${current}\n\n${chunk}` : chunk;
    if (next.length <= maxLength) {
      current = next;
      return;
    }
    if (current) {
      parts.push(current);
    }
    if (chunk.length <= maxLength) {
      current = chunk;
      return;
    }
    for (let offset = 0; offset < chunk.length; offset += maxLength) {
      const slice = chunk.slice(offset, offset + maxLength);
      if (offset + maxLength >= chunk.length) {
        current = slice;
      } else {
        parts.push(slice);
      }
    }
  };

  for (const paragraph of text.split(/\n{2,}/)) {
    if (paragraph.length <= maxLength) {
      append(paragraph);
      continue;
    }
    for (const line of paragraph.split('\n')) {
      append(line);
    }
  }
  if (current) {
    parts.push(current);
  }
  return parts;
}

function addScenarioArtifactLinks(markdown, artifacts, { repo, runId, manifest }) {
  const mappings = scenarioDownloadMap(artifacts, manifest, repo, runId);
  if (mappings.length === 0) {
    throw new Error('No per-scenario Hermes profile artifacts were published');
  }
  return linkScenarioNames(markdown, mappings);
}

async function post(channel, text, token, options) {
  const payload = {
    channel,
    text,
    unfurl_links: false,
    unfurl_media: false,
  };
  if (options?.threadTs) {
    payload.thread_ts = options.threadTs;
  }
  const body = await slackApi('chat.postMessage', token, payload, options);
  return { channel, ts: body.ts };
}

async function postAllParts(
  channel,
  parts,
  token,
  options,
  runUrl,
  runLabel,
) {
  let parentTs = null;
  let last = null;
  for (let index = 0; index < parts.length; index += 1) {
    const isLast = index === parts.length - 1;
    const text = buildText(parts[index], isLast ? runUrl : '', runLabel);
    last = await post(channel, text, token, {
      ...options,
      threadTs: parentTs || undefined,
    });
    if (!parentTs) {
      parentTs = last.ts;
    }
  }
  return { parentTs, last };
}

/**
 * Posts the summary, addressing a user id directly first because that only
 * needs `chat:write`. Opening the DM explicitly needs the extra `im:write`
 * scope, so it is a fallback rather than the default path.
 *
 * Messages that exceed Slack's 40k limit are posted as a thread, not cut.
 */
async function postSummary(
  { markdown, target, token, runUrl, runLabel, cards = [] },
  options = {},
) {
  const footerReserve = runUrl ? 400 : 0;
  const parts = splitForSlack(markdown, MAX_TEXT_LENGTH - footerReserve);
  const cardParts = cards.flatMap((card) =>
    splitForSlack(card, MAX_TEXT_LENGTH - footerReserve),
  );

  const deliver = async (channel) => {
    const posted = await postAllParts(
      channel,
      parts,
      token,
      options,
      cardParts.length > 0 ? '' : runUrl,
      runLabel,
    );
    let last = posted.last;
    for (let index = 0; index < cardParts.length; index += 1) {
      const isLast = index === cardParts.length - 1;
      last = await post(
        channel,
        buildText(cardParts[index], isLast ? runUrl : '', runLabel),
        token,
        { ...options, threadTs: posted.parentTs },
      );
    }
    return last;
  };

  try {
    return await deliver(target);
  } catch (error) {
    if (!isUserId(target)) {
      throw error;
    }
    console.log(
      `Direct post to ${target} failed (${error.message}); opening a DM instead`,
    );
  }

  const channel = await openDirectMessage(target, token, options);
  return deliver(channel);
}

function readSlackCards(markdownPath) {
  const cardsPath = path.join(path.dirname(markdownPath), 'slack-cards.json');
  if (!fs.existsSync(cardsPath)) {
    return [];
  }
  const parsed = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));
  return Array.isArray(parsed)
    ? parsed.filter((card) => typeof card === 'string' && card.trim())
    : [];
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

  let markdown = fs.readFileSync(markdownPath, 'utf8');
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepository = process.env.GITHUB_REPOSITORY;
  const githubRunId = process.env.GITHUB_RUN_ID;
  if (githubToken && githubRepository && githubRunId) {
    const artifacts = await listRunArtifacts(
      githubRepository,
      githubRunId,
      githubToken,
    );
    const hasScenarioArtifacts = artifacts.some((artifact) =>
      String(artifact.name || '').startsWith('hermes-profile-'),
    );
    if (hasScenarioArtifacts) {
      markdown = addScenarioArtifactLinks(markdown, artifacts, {
        repo: githubRepository,
        runId: githubRunId,
        manifest: readManifest(markdownPath),
      });
    } else {
      console.log('ℹ️ No per-scenario Hermes artifacts; posting digest as-is');
    }
  }

  const result = await postSummary({
    markdown,
    target,
    token,
    runUrl: process.env.GITHUB_RUN_URL,
    runLabel: process.env.GITHUB_RUN_LABEL,
    cards: readSlackCards(markdownPath),
  });
  console.log(`✅ Slack message sent to ${result.channel} (ts=${result.ts})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}

export {
  isUserId,
  openDirectMessage,
  buildText,
  splitForSlack,
  addScenarioArtifactLinks,
  postSummary,
  readSlackCards,
};
