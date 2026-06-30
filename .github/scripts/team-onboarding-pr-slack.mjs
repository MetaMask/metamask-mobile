#!/usr/bin/env node

/**
 * Team Onboarding PR Slack Bot
 *
 * Posts and updates a Slack thread in #metamask-onboarding-mobile-internal for
 * team-onboarding PRs once they are ready for review.
 *
 * Required env:
 *   GITHUB_TOKEN, SLACK_BOT_TOKEN, GITHUB_REPOSITORY, ACTION
 *
 * Optional env:
 *   TEAM_ONBOARDING_SLACK_CHANNEL (default: metamask-onboarding-mobile-internal)
 *   GITHUB_EVENT_PATH, GITHUB_EVENT_NAME, DRY_RUN=true
 */

import fs from 'fs';

export const TEAM_LABEL = 'team-onboarding';
export const MARKER_PREFIX = 'team-onboarding-pr-slack:';
export const MARKER_REGEX = new RegExp(
  `<!--\\s*${MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)\\s*-->`,
);

export const CURSOR_BOT_LOGINS = new Set([
  'cursor[bot]',
  'cursorbot',
  'cursoragent',
]);

export const IGNORED_COMMENT_BOT_LOGINS = new Set([
  'github-actions[bot]',
  'dependabot[bot]',
  'metamaskbot',
  'metamaskbotv2[bot]',
  'crowdin-bot',
  'runway-github[bot]',
]);

const DEFAULT_CHANNEL = 'metamask-onboarding-mobile-internal';

/**
 * @param {string} channel
 * @returns {string}
 */
export function normalizeChannelName(channel) {
  return channel.replace(/^#/, '').trim();
}

/**
 * @param {Array<{ name: string }>} labels
 * @returns {boolean}
 */
export function hasTeamOnboardingLabel(labels) {
  return labels.some((label) => label.name === TEAM_LABEL);
}

/**
 * @param {string} body
 * @returns {Record<string, unknown> | null}
 */
export function parseThreadMarker(body) {
  const match = body.match(MARKER_REGEX);
  if (!match?.[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} meta
 * @returns {string}
 */
export function buildMarkerComment(meta) {
  return `<!-- ${MARKER_PREFIX}${JSON.stringify(meta)} -->\n_Slack thread tracked for team onboarding review._`;
}

/**
 * @param {string | undefined | null} login
 * @returns {boolean}
 */
export function isCursorBot(login) {
  return Boolean(login && CURSOR_BOT_LOGINS.has(login));
}

/**
 * @param {string | undefined | null} login
 * @returns {boolean}
 */
export function isIgnoredCommentBot(login) {
  return Boolean(login && IGNORED_COMMENT_BOT_LOGINS.has(login));
}

/**
 * @param {string} login
 * @returns {string}
 */
export function formatGithubAuthorMention(login) {
  return `<https://github.com/${login}|@${login}>`;
}

/**
 * @param {string} conclusion
 * @returns {'success' | 'failure' | 'other'}
 */
export function normalizeCiConclusion(conclusion) {
  if (conclusion === 'success') {
    return 'success';
  }
  if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(conclusion)) {
    return 'failure';
  }
  return 'other';
}

/**
 * @param {Object} options
 * @param {import('@octokit/rest').Octokit} options.octokit
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {number} options.prNumber
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readThreadMeta({ octokit, owner, repo, prNumber }) {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  for (const comment of comments) {
    const meta = parseThreadMarker(comment.body ?? '');
    if (meta?.threadTs && meta?.channelId) {
      return {
        ...meta,
        commentId: comment.id,
      };
    }
  }

  return null;
}

/**
 * @param {Object} options
 * @param {import('@octokit/rest').Octokit} options.octokit
 * @param {string} options.owner
 * @param {string} options.repo
 * @param {number} options.prNumber
 * @param {Record<string, unknown>} options.meta
 * @returns {Promise<void>}
 */
export async function writeThreadMeta({ octokit, owner, repo, prNumber, meta }) {
  const body = buildMarkerComment(meta);
  const existing = await readThreadMeta({ octokit, owner, repo, prNumber });

  if (existing?.commentId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: Number(existing.commentId),
      body,
    });
    return;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
}

class SlackClient {
  /**
   * @param {string} token
   */
  constructor(token) {
    this.token = token;
    this.channelCache = new Map();
  }

  /**
   * @param {string} method
   * @param {Record<string, unknown>} body
   * @returns {Promise<Record<string, unknown>>}
   */
  async api(method, body) {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(`Slack API ${method} failed: ${payload.error ?? 'unknown_error'}`);
    }

    return payload;
  }

  /**
   * @param {string} channelName
   * @returns {Promise<string>}
   */
  async resolveChannelId(channelName) {
    const normalized = normalizeChannelName(channelName);
    if (this.channelCache.has(normalized)) {
      return this.channelCache.get(normalized);
    }

    let cursor;
    do {
      const payload = await this.api('conversations.list', {
        types: 'public_channel,private_channel',
        limit: 200,
        cursor,
      });

      const match = (payload.channels ?? []).find((channel) => channel.name === normalized);
      if (match?.id) {
        this.channelCache.set(normalized, match.id);
        return match.id;
      }

      cursor = payload.response_metadata?.next_cursor || undefined;
    } while (cursor);

    throw new Error(`Slack channel not found: ${normalized}`);
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string} options.text
   * @param {string} [options.threadTs]
   * @returns {Promise<string>}
   */
  async postMessage({ channelId, text, threadTs }) {
    const payload = await this.api('chat.postMessage', {
      channel: channelId,
      text,
      thread_ts: threadTs,
      unfurl_links: false,
      unfurl_media: false,
    });

    const ts = threadTs ?? payload.ts;
    if (!ts || typeof ts !== 'string') {
      throw new Error('Slack postMessage did not return a timestamp');
    }

    return ts;
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string} options.timestamp
   * @param {string} options.emoji
   * @returns {Promise<void>}
   */
  async addReaction({ channelId, timestamp, emoji }) {
    try {
      await this.api('reactions.add', {
        channel: channelId,
        timestamp,
        name: emoji,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already_reacted')) {
        return;
      }
      throw error;
    }
  }

  /**
   * @param {Object} options
   * @param {string} options.channelId
   * @param {string} options.timestamp
   * @param {string} options.emoji
   * @returns {Promise<void>}
   */
  async removeReaction({ channelId, timestamp, emoji }) {
    try {
      await this.api('reactions.remove', {
        channel: channelId,
        timestamp,
        name: emoji,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('no_reaction')) {
        return;
      }
      throw error;
    }
  }
}

/**
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} login
 * @returns {Promise<string>}
 */
async function resolveAuthorSlackMention(octokit, login) {
  try {
    const { data } = await octokit.rest.users.getByUsername({ username: login });
    if (data.email) {
      return formatGithubAuthorMention(login);
    }
  } catch {
    // Fall through to GitHub profile mention.
  }

  return formatGithubAuthorMention(login);
}

/**
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {number} prNumber
 * @returns {Promise<import('@octokit/openapi-types').components['schemas']['pull-request']>}
 */
async function getPullRequest(octokit, owner, repo, prNumber) {
  const { data } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  return data;
}

/**
 * @param {Object} context
 * @param {import('@octokit/rest').Octokit} context.octokit
 * @param {string} context.owner
 * @param {string} context.repo
 * @param {SlackClient} context.slack
 * @param {number} context.prNumber
 * @param {boolean} context.dryRun
 * @returns {Promise<void>}
 */
async function createThread({ octokit, owner, repo, slack, prNumber, dryRun }) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);

  if (pr.draft || pr.head.repo?.fork) {
    return;
  }

  if (!hasTeamOnboardingLabel(pr.labels)) {
    return;
  }

  const existing = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (existing?.threadTs) {
    return;
  }

  const channelName = process.env.TEAM_ONBOARDING_SLACK_CHANNEL || DEFAULT_CHANNEL;
  const channelId = dryRun ? 'DRY_RUN_CHANNEL' : await slack.resolveChannelId(channelName);
  const authorMention = await resolveAuthorSlackMention(octokit, pr.user.login);
  const prUrl = pr.html_url;
  const text = [
    `:eyes: *PR ready for review* — ${authorMention}`,
    `*${pr.title}*`,
    prUrl,
  ].join('\n');

  if (dryRun) {
    console.log('[dry-run] create-thread', { channelName, text });
    return;
  }

  const threadTs = await slack.postMessage({ channelId, text });
  await writeThreadMeta({
    octokit,
    owner,
    repo,
    prNumber,
    meta: {
      threadTs,
      channelId,
      lastCiConclusion: null,
    },
  });
}

/**
 * @param {Object} context
 * @param {import('@octokit/rest').Octokit} context.octokit
 * @param {string} context.owner
 * @param {string} context.repo
 * @param {SlackClient} context.slack
 * @param {number} context.prNumber
 * @param {string} context.conclusion
 * @param {string} context.workflowUrl
 * @param {boolean} context.dryRun
 * @returns {Promise<void>}
 */
async function notifyCiStatus({
  octokit,
  owner,
  repo,
  slack,
  prNumber,
  conclusion,
  workflowUrl,
  dryRun,
}) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);
  if (!hasTeamOnboardingLabel(pr.labels)) {
    return;
  }

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) {
    return;
  }

  const normalized = normalizeCiConclusion(conclusion);
  if (normalized === 'other') {
    return;
  }

  if (meta.lastCiConclusion === normalized) {
    return;
  }

  const authorMention = await resolveAuthorSlackMention(octokit, pr.user.login);
  const statusText =
    normalized === 'success'
      ? ':white_check_mark: CI passed'
      : ':x: CI failed';
  const text = `${statusText} for <${pr.html_url}|PR #${prNumber}> — ${authorMention}\n<${workflowUrl}|View workflow run>`;

  if (dryRun) {
    console.log('[dry-run] ci-status', { normalized, text });
    return;
  }

  await slack.postMessage({
    channelId: String(meta.channelId),
    threadTs: String(meta.threadTs),
    text,
  });

  if (normalized === 'failure') {
    await slack.addReaction({
      channelId: String(meta.channelId),
      timestamp: String(meta.threadTs),
      emoji: 'alert',
    });
  } else {
    await slack.removeReaction({
      channelId: String(meta.channelId),
      timestamp: String(meta.threadTs),
      emoji: 'alert',
    });
  }

  await writeThreadMeta({
    octokit,
    owner,
    repo,
    prNumber,
    meta: {
      ...meta,
      lastCiConclusion: normalized,
    },
  });
}

/**
 * @param {Object} context
 * @param {import('@octokit/rest').Octokit} context.octokit
 * @param {string} context.owner
 * @param {string} context.repo
 * @param {SlackClient} context.slack
 * @param {number} context.prNumber
 * @param {string} context.actorLogin
 * @param {string} context.message
 * @param {string} context.kind
 * @param {boolean} context.dryRun
 * @returns {Promise<void>}
 */
async function notifyThreadReply({
  octokit,
  owner,
  repo,
  slack,
  prNumber,
  actorLogin,
  message,
  kind,
  dryRun,
}) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);
  if (!hasTeamOnboardingLabel(pr.labels)) {
    return;
  }

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) {
    return;
  }

  const authorMention = await resolveAuthorSlackMention(octokit, pr.user.login);
  const actorMention = formatGithubAuthorMention(actorLogin);
  const trimmedMessage = message.trim().slice(0, 500);
  const text = [
    kind === 'cursor-bot'
      ? `:robot_face: Cursor Bug Bot commented on <${pr.html_url}|PR #${prNumber}> — ${authorMention}`
      : `:speech_balloon: Review comment on <${pr.html_url}|PR #${prNumber}> from ${actorMention} — ${authorMention}`,
    trimmedMessage || '_No comment body provided._',
  ].join('\n');

  if (dryRun) {
    console.log('[dry-run] thread-reply', { kind, text });
    return;
  }

  await slack.postMessage({
    channelId: String(meta.channelId),
    threadTs: String(meta.threadTs),
    text,
  });
}

/**
 * @param {Object} context
 * @param {import('@octokit/rest').Octokit} context.octokit
 * @param {string} context.owner
 * @param {string} context.repo
 * @param {SlackClient} context.slack
 * @param {number} context.prNumber
 * @param {boolean} context.dryRun
 * @returns {Promise<void>}
 */
async function notifyMerged({ octokit, owner, repo, slack, prNumber, dryRun }) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);
  if (!hasTeamOnboardingLabel(pr.labels)) {
    return;
  }

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) {
    return;
  }

  const authorMention = await resolveAuthorSlackMention(octokit, pr.user.login);
  const text = `:tada: <${pr.html_url}|PR #${prNumber}> merged — ${authorMention}`;

  if (dryRun) {
    console.log('[dry-run] merged', { text });
    return;
  }

  await slack.postMessage({
    channelId: String(meta.channelId),
    threadTs: String(meta.threadTs),
    text,
  });

  await slack.addReaction({
    channelId: String(meta.channelId),
    timestamp: String(meta.threadTs),
    emoji: 'white_check_mark',
  });
}

/**
 * @param {import('@octokit/rest').Octokit} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {string} headSha
 * @returns {Promise<number[]>}
 */
async function findOpenPrNumbersForSha(octokit, owner, repo, headSha) {
  const { data } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: headSha,
  });

  return data
    .filter((pr) => pr.state === 'open')
    .map((pr) => pr.number);
}

/**
 * @returns {Record<string, unknown>}
 */
function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error('GITHUB_EVENT_PATH is missing or unreadable');
  }

  return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
}

/**
 * @returns {Promise<void>}
 */
export async function main() {
  const action = process.env.ACTION;
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const dryRun = process.env.DRY_RUN === 'true';

  if (!action || !repository || !token) {
    throw new Error('ACTION, GITHUB_REPOSITORY, and GITHUB_TOKEN are required');
  }

  if (!slackToken && !dryRun) {
    throw new Error('SLACK_BOT_TOKEN is required unless DRY_RUN=true');
  }

  const [owner, repo] = repository.split('/');
  const event = readEventPayload();
  const eventName = process.env.GITHUB_EVENT_NAME ?? 'unknown';

  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });
  const slack = new SlackClient(slackToken ?? 'dry-run-token');

  switch (action) {
    case 'create-thread': {
      const pr = event.pull_request;
      if (!pr?.number) {
        return;
      }

      const isReady =
        eventName === 'pull_request' &&
        (event.action === 'ready_for_review' ||
          (event.action === 'opened' && !pr.draft) ||
          (event.action === 'labeled' && event.label?.name === TEAM_LABEL));

      if (!isReady) {
        return;
      }

      await createThread({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        dryRun,
      });
      return;
    }

    case 'ci-status': {
      const workflowRun = event.workflow_run;
      if (!workflowRun || workflowRun.event !== 'pull_request') {
        return;
      }

      const prNumbers = new Set(
        (workflowRun.pull_requests ?? []).map((pr) => pr.number).filter(Boolean),
      );

      if (prNumbers.size === 0 && workflowRun.head_sha) {
        const associated = await findOpenPrNumbersForSha(
          octokit,
          owner,
          repo,
          workflowRun.head_sha,
        );
        associated.forEach((number) => prNumbers.add(number));
      }

      for (const prNumber of prNumbers) {
        await notifyCiStatus({
          octokit,
          owner,
          repo,
          slack,
          prNumber,
          conclusion: workflowRun.conclusion ?? 'unknown',
          workflowUrl: workflowRun.html_url,
          dryRun,
        });
      }
      return;
    }

    case 'review-comment': {
      const review = event.review;
      const pr = event.pull_request;
      if (!review || !pr?.number || review.user?.type === 'Bot') {
        return;
      }

      if (isCursorBot(review.user?.login)) {
        await notifyThreadReply({
          octokit,
          owner,
          repo,
          slack,
          prNumber: pr.number,
          actorLogin: review.user.login,
          message: review.body ?? '',
          kind: 'cursor-bot',
          dryRun,
        });
        return;
      }

      if (isIgnoredCommentBot(review.user?.login)) {
        return;
      }

      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        actorLogin: review.user.login,
        message: review.body ?? '',
        kind: 'reviewer',
        dryRun,
      });
      return;
    }

    case 'inline-review-comment': {
      const comment = event.comment;
      const pr = event.pull_request;
      if (!comment || !pr?.number || comment.user?.type === 'Bot') {
        return;
      }

      if (isIgnoredCommentBot(comment.user?.login)) {
        return;
      }

      const kind = isCursorBot(comment.user?.login) ? 'cursor-bot' : 'reviewer';
      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        actorLogin: comment.user.login,
        message: comment.body ?? '',
        kind,
        dryRun,
      });
      return;
    }

    case 'issue-comment': {
      const comment = event.comment;
      const issue = event.issue;
      if (!comment || !issue?.number || !issue.pull_request) {
        return;
      }

      if (parseThreadMarker(comment.body ?? '')) {
        return;
      }

      const login = comment.user?.login;
      if (!isCursorBot(login)) {
        return;
      }

      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: issue.number,
        actorLogin: login,
        message: comment.body ?? '',
        kind: 'cursor-bot',
        dryRun,
      });
      return;
    }

    case 'merged': {
      const pr = event.pull_request;
      if (!pr?.number || !pr.merged) {
        return;
      }

      await notifyMerged({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        dryRun,
      });
      return;
    }

    default:
      throw new Error(`Unsupported ACTION: ${action}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
