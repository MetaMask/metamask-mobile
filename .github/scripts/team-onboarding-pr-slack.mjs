#!/usr/bin/env node

/** Team onboarding PR Slack bot — see .github/workflows/team-onboarding-pr-slack.yml */

import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEAM_LABEL = 'team-onboarding';
export const MARKER_PREFIX = 'team-onboarding-pr-slack:';
export const MARKER_REGEX = new RegExp(
  `<!--\\s*${MARKER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)\\s*-->`,
);
export const CURSOR_BOT_LOGINS = new Set(['cursor[bot]', 'cursorbot', 'cursoragent']);
export const IGNORED_COMMENT_BOT_LOGINS = new Set([
  'github-actions[bot]',
  'dependabot[bot]',
  'metamaskbot',
  'metamaskbotv2[bot]',
  'crowdin-bot',
  'runway-github[bot]',
]);

const DEFAULT_CHANNEL = 'metamask-onboarding-mobile-internal';

export function normalizeChannelName(channel) {
  return channel.replace(/^#/, '').trim();
}

export function hasTeamOnboardingLabel(labels) {
  return labels.some((label) => label.name === TEAM_LABEL);
}

export function parseThreadMarker(body) {
  const match = body.match(MARKER_REGEX);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

export function buildMarkerComment(meta) {
  return `<!-- ${MARKER_PREFIX}${JSON.stringify(meta)} -->\n_Slack thread tracked for team onboarding review._`;
}

export function isCursorBot(login) {
  return Boolean(login && CURSOR_BOT_LOGINS.has(login));
}

export function isIgnoredCommentBot(login) {
  return Boolean(login && IGNORED_COMMENT_BOT_LOGINS.has(login));
}

export function isNotifiableCommenter(login, userType) {
  if (!login) return false;
  if (isCursorBot(login)) return true;
  if (isIgnoredCommentBot(login)) return false;
  return userType !== 'Bot';
}

export function formatGithubAuthorMention(login) {
  return `<https://github.com/${login}|@${login}>`;
}

export function normalizeCiConclusion(conclusion) {
  if (conclusion === 'success') return 'success';
  if (['failure', 'cancelled', 'timed_out', 'action_required'].includes(conclusion)) {
    return 'failure';
  }
  return 'other';
}

export function resolveAction(eventName, event) {
  if (eventName === 'workflow_run') return 'ci-status';
  if (eventName === 'pull_request_review') return 'review-comment';
  if (eventName === 'pull_request_review_comment') return 'inline-review-comment';
  if (eventName === 'issue_comment') return 'issue-comment';
  if (eventName === 'pull_request') {
    if (event.action === 'closed' && event.pull_request?.merged) return 'merged';
    if (
      event.action === 'ready_for_review' ||
      (event.action === 'opened' && !event.pull_request?.draft) ||
      (event.action === 'labeled' && event.label?.name === TEAM_LABEL)
    ) {
      return 'create-thread';
    }
  }
  return null;
}

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
      return { ...meta, commentId: comment.id };
    }
  }
  return null;
}

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
  await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
}

class SlackClient {
  constructor(token) {
    this.token = token;
    this.channelCache = new Map();
  }

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

  async resolveChannelId(channelName) {
    const normalized = normalizeChannelName(channelName);
    if (this.channelCache.has(normalized)) return this.channelCache.get(normalized);
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

  async addReaction({ channelId, timestamp, emoji }) {
    try {
      await this.api('reactions.add', { channel: channelId, timestamp, name: emoji });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already_reacted'))) throw error;
    }
  }

  async removeReaction({ channelId, timestamp, emoji }) {
    try {
      await this.api('reactions.remove', { channel: channelId, timestamp, name: emoji });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('no_reaction'))) throw error;
    }
  }
}

async function getPullRequest(octokit, owner, repo, prNumber) {
  const { data } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
  return data;
}

async function findOpenPrNumbersForSha(octokit, owner, repo, headSha) {
  const { data } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: headSha,
  });
  return data.filter((pr) => pr.state === 'open').map((pr) => pr.number);
}

function readEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error('GITHUB_EVENT_PATH is missing or unreadable');
  }
  return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
}

async function createThread({ octokit, owner, repo, slack, prNumber, dryRun }) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);
  if (pr.draft || pr.head.repo?.fork || !hasTeamOnboardingLabel(pr.labels)) return;
  if ((await readThreadMeta({ octokit, owner, repo, prNumber }))?.threadTs) return;

  const channelName = process.env.TEAM_ONBOARDING_SLACK_CHANNEL || DEFAULT_CHANNEL;
  const channelId = dryRun ? 'DRY_RUN_CHANNEL' : await slack.resolveChannelId(channelName);
  const authorMention = formatGithubAuthorMention(pr.user.login);
  const text = `:eyes: *PR ready for review* — ${authorMention}\n*${pr.title}*\n${pr.html_url}`;

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
    meta: { threadTs, channelId, lastCiConclusion: null },
  });
}

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
  if (!hasTeamOnboardingLabel(pr.labels)) return;

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) return;

  const normalized = normalizeCiConclusion(conclusion);
  if (normalized === 'other' || meta.lastCiConclusion === normalized) return;

  const authorMention = formatGithubAuthorMention(pr.user.login);
  const statusText = normalized === 'success' ? ':white_check_mark: CI passed' : ':x: CI failed';
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
    meta: { ...meta, lastCiConclusion: normalized },
  });
}

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
  if (!hasTeamOnboardingLabel(pr.labels)) return;

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) return;

  const authorMention = formatGithubAuthorMention(pr.user.login);
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

async function notifyMerged({ octokit, owner, repo, slack, prNumber, dryRun }) {
  const pr = await getPullRequest(octokit, owner, repo, prNumber);
  if (!hasTeamOnboardingLabel(pr.labels)) return;

  const meta = await readThreadMeta({ octokit, owner, repo, prNumber });
  if (!meta?.threadTs || !meta?.channelId) return;

  const authorMention = formatGithubAuthorMention(pr.user.login);
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

export async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const dryRun = process.env.DRY_RUN === 'true';
  if (!repository || !token) {
    throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
  }
  if (!slackToken && !dryRun) {
    throw new Error('SLACK_BOT_TOKEN is required unless DRY_RUN=true');
  }

  const [owner, repo] = repository.split('/');
  const event = readEventPayload();
  const eventName = process.env.GITHUB_EVENT_NAME ?? 'unknown';
  const action = process.env.ACTION ?? resolveAction(eventName, event);
  if (!action) return;

  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });
  const slack = new SlackClient(slackToken ?? 'dry-run-token');

  switch (action) {
    case 'create-thread': {
      const pr = event.pull_request;
      if (!pr?.number) return;
      await createThread({ octokit, owner, repo, slack, prNumber: pr.number, dryRun });
      return;
    }
    case 'ci-status': {
      const workflowRun = event.workflow_run;
      if (!workflowRun || workflowRun.event !== 'pull_request') return;
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
      if (!review || !pr?.number) return;
      if (!isNotifiableCommenter(review.user?.login, review.user?.type)) return;
      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        actorLogin: review.user.login,
        message: review.body ?? '',
        kind: isCursorBot(review.user.login) ? 'cursor-bot' : 'reviewer',
        dryRun,
      });
      return;
    }
    case 'inline-review-comment': {
      const comment = event.comment;
      const pr = event.pull_request;
      if (!comment || !pr?.number) return;
      if (!isNotifiableCommenter(comment.user?.login, comment.user?.type)) return;
      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: pr.number,
        actorLogin: comment.user.login,
        message: comment.body ?? '',
        kind: isCursorBot(comment.user.login) ? 'cursor-bot' : 'reviewer',
        dryRun,
      });
      return;
    }
    case 'issue-comment': {
      const comment = event.comment;
      const issue = event.issue;
      if (!comment || !issue?.number || !issue.pull_request) return;
      if (parseThreadMarker(comment.body ?? '')) return;
      if (!isCursorBot(comment.user?.login)) return;
      await notifyThreadReply({
        octokit,
        owner,
        repo,
        slack,
        prNumber: issue.number,
        actorLogin: comment.user.login,
        message: comment.body ?? '',
        kind: 'cursor-bot',
        dryRun,
      });
      return;
    }
    case 'merged': {
      const pr = event.pull_request;
      if (!pr?.number || !pr.merged || pr.head?.repo?.fork) return;
      await notifyMerged({ octokit, owner, repo, slack, prNumber: pr.number, dryRun });
      return;
    }
    default:
      throw new Error(`Unsupported ACTION: ${action}`);
  }
}

function isRunningAsCli() {
  const scriptPath = fileURLToPath(import.meta.url);
  const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return scriptPath === invokedPath;
}

if (isRunningAsCli()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
