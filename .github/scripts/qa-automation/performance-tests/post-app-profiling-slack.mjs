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

function scenarioDownloadMap(artifacts, manifest, repo, runId) {
  const byName = new Map(
    artifacts
      .filter((artifact) => !artifact.expired)
      .map((artifact) => [artifact.name, artifact]),
  );
  return (manifest?.include || [])
    .map((item) => {
      const artifact = byName.get(item.artifactName);
      if (!artifact || !item.scenario) {
        return null;
      }
      return {
        scenario: item.scenario,
        url: `https://github.com/${repo}/actions/runs/${runId}/artifacts/${artifact.id}`,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.scenario.length - left.scenario.length);
}

function linkScenarioNames(markdown, mappings) {
  let text = String(markdown || '');
  for (const { scenario, url } of mappings) {
    const linked = `<${url}|${scenario}>`;
    text = text
      .split(/(<https?:\/\/[^>|]+\|[^>]+>)/)
      .map((part, index) => {
        if (index % 2 === 1) {
          return part;
        }
        return part.split(`*${scenario}*`).join(linked).split(scenario).join(linked);
      })
      .join('');
  }
  return text;
}

async function listRunArtifacts(repo, runId, token, { fetchFn = fetch } = {}) {
  const response = await fetchFn(
    `https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );
  if (!response.ok) {
    throw new Error(`GitHub artifacts HTTP ${response.status}`);
  }
  const payload = await response.json();
  return payload.artifacts || [];
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
  return last;
}

/**
 * Posts the summary, addressing a user id directly first because that only
 * needs `chat:write`. Opening the DM explicitly needs the extra `im:write`
 * scope, so it is a fallback rather than the default path.
 *
 * Messages that exceed Slack's 40k limit are posted as a thread, not cut.
 */
async function postSummary(
  { markdown, target, token, runUrl, runLabel },
  options = {},
) {
  const footerReserve = runUrl ? 400 : 0;
  const parts = splitForSlack(markdown, MAX_TEXT_LENGTH - footerReserve);

  try {
    return await postAllParts(
      target,
      parts,
      token,
      options,
      runUrl,
      runLabel,
    );
  } catch (error) {
    if (!isUserId(target)) {
      throw error;
    }
    console.log(
      `Direct post to ${target} failed (${error.message}); opening a DM instead`,
    );
  }

  const channel = await openDirectMessage(target, token, options);
  return postAllParts(channel, parts, token, options, runUrl, runLabel);
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
    const manifestPath = path.join(
      path.dirname(markdownPath),
      'scenario-artifacts.json',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    markdown = addScenarioArtifactLinks(markdown, artifacts, {
      repo: githubRepository,
      runId: githubRunId,
      manifest,
    });
  }

  const result = await postSummary({
    markdown,
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

export {
  isUserId,
  openDirectMessage,
  buildText,
  splitForSlack,
  scenarioDownloadMap,
  linkScenarioNames,
  addScenarioArtifactLinks,
  postSummary,
};
