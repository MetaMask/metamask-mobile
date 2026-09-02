#!/usr/bin/env ts-node
/**
 * Dependency Audit Escalation Slack Notification
 *
 * Posts a Slack message when the dependency-audit-escalation workflow
 * finds new production advisories, tagging the audit owner and, if
 * configured, their manager (see .github/audit-owners.yml).
 *
 * Runs in one of three stages, controlled by SLACK_STAGE, so the owner gets
 * a heads-up as soon as new advisories are found instead of only learning
 * about them once the tracking issue already exists.
 *
 * "detected" is posted right after advisories are collected, before the
 * tracking-issue step runs: announces how many new advisories were found,
 * with a link to the running workflow. "result" (the default) is posted
 * once the tracking issue is filed/updated: the final summary with a link
 * to it. "failure" is posted when an infra step fails after "detected"
 * already went out — by default GitHub Actions skips every step after a
 * failed one, which would otherwise leave the owner with a "detected"
 * message and then silence, with no indication anything had gone wrong.
 * This is a minimal alert, not a full result summary — it doesn't require
 * AUDIT_RESULT_PATH, since the whole point is to fire even when the steps
 * that produce that file's later state didn't run.
 *
 * The "result"/"failure" messages are posted as a threaded reply to the
 * "detected" message when SLACK_THREAD_TS is set, so all land in one place.
 *
 * Required env: SLACK_BOT_TOKEN, AUDIT_RESULT_PATH (not required for "failure")
 * Optional env: OWNERS_YML_PATH (default .github/audit-owners.yml),
 * SLACK_STAGE ("detected" | "result" | "failure", default "result"),
 * SLACK_THREAD_TS (reply in this thread instead of posting top-level),
 * SLACK_MESSAGE_TS_PATH (default slack-message-ts.txt; where this run's
 * message timestamp is written, so a later "result" call can thread off of
 * it), ISSUE_URL, RUN_URL, FAILED_STEP, SLACK_AUDIT_NOTIFICATION_DRY_RUN
 */

import fs from 'fs';
import yaml from 'js-yaml';

const DEFAULT_OWNERS_PATH = '.github/audit-owners.yml';

// Slack message timestamps are always `<seconds>.<microseconds>`, e.g.
// "1503435956.000247". This is the only shape of `chat.postMessage`'s
// response we ever trust enough to write to disk — see postToSlack() below.
const SLACK_TS_PATTERN = /^\d+\.\d+$/;

interface Owners {
  slack_channel: string;
  owner: { github: string; slack_id: string };
  manager?: { slack_id: string };
}

interface AdvisoryEntry {
  pkg: string;
  id: string;
  severity: string;
  title: string;
  url?: string;
}

interface AuditResult {
  fixed: AdvisoryEntry[];
  manual: AdvisoryEntry[];
}

interface SlackPayload {
  blocks: object[];
  text: string;
}

export function loadOwners(path: string): Owners {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = yaml.load(raw) as Partial<Owners> | undefined;
  if (!parsed?.slack_channel || !parsed?.owner?.slack_id) {
    throw new Error(`${path} is missing slack_channel or owner.slack_id`);
  }
  return parsed as Owners;
}

function loadAuditResult(path: string): AuditResult {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  return { fixed: parsed.fixed ?? [], manual: parsed.manual ?? [] };
}

function advisoryLine(entry: AdvisoryEntry): string {
  const link = entry.url ? `<${entry.url}|${entry.id}>` : entry.id;
  const line = `• *${entry.pkg}* (${entry.severity}) — ${link}: ${entry.title}`;
  // Advisory titles are normally short, but nothing enforces that upstream —
  // clamp defensively so one unusually long title can't blow the per-section
  // limit in buildAdvisorySections() below on its own.
  return line.length > 500 ? `${line.slice(0, 500)}…` : line;
}

// Slack rejects a section block's `text.text` over 3000 characters. A small
// number of advisories normally fits easily, but a large first-run backlog
// could exceed it and fail the whole `chat.postMessage` call — silently
// dropping the threaded "result" message even though "detected" already
// went out. Leave headroom below Slack's actual limit for the header line
// itself and the "(cont.)" suffix.
const SLACK_SECTION_TEXT_LIMIT = 2900;

/**
 * Splits a header + a list of advisories into one or more Slack `section`
 * blocks, each kept under Slack's per-block text limit.
 */
function buildAdvisorySections(header: string, entries: AdvisoryEntry[]): object[] {
  const sections: object[] = [];
  let current = header;
  for (const entry of entries) {
    const line = advisoryLine(entry);
    const candidate = `${current}\n${line}`;
    if (candidate.length > SLACK_SECTION_TEXT_LIMIT && current !== header) {
      sections.push({ type: 'section', text: { type: 'mrkdwn', text: current } });
      current = `${header} (cont.)\n${line}`;
    } else {
      current = candidate;
    }
  }
  sections.push({ type: 'section', text: { type: 'mrkdwn', text: current } });
  return sections;
}

/**
 * The "we just found something and are working on it" message, posted before
 * any tracking issue exists — see the SLACK_STAGE doc comment above.
 */
export function buildDetectedMessage({
  count,
  runUrl,
  ownerSlackId,
  managerSlackId,
}: {
  count: number;
  runUrl: string;
  ownerSlackId: string;
  managerSlackId?: string;
}): SlackPayload {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const headerText =
    count === 1
      ? '🔎 Dependency audit: 1 new advisory detected'
      : `🔎 Dependency audit: ${count} new advisories detected`;

  const blocks: object[] = [
    { type: 'header', text: { type: 'plain_text', text: headerText, emoji: true } },
  ];

  if (runUrl) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<${runUrl}|Watch the run> — I'll reply in this thread once a tracking issue is filed.` },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `cc ${mentions.join(' ')} — see .github/audit-owners.yml for the escalation process.`,
        },
      ],
    },
  );

  return { blocks, text: headerText };
}

/**
 * The final "here's what happened" message, posted once any tracking issue
 * is done — see the SLACK_STAGE doc comment above.
 */
export function buildResultMessage({
  fixed,
  manual,
  issueUrl,
  runUrl,
  ownerSlackId,
  managerSlackId,
}: {
  fixed: AdvisoryEntry[];
  manual: AdvisoryEntry[];
  issueUrl: string;
  runUrl: string;
  ownerSlackId: string;
  managerSlackId?: string;
}): SlackPayload {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const total = fixed.length + manual.length;
  const headerText =
    total === 1 ? '🔒 Dependency audit: 1 new advisory found' : `🔒 Dependency audit: ${total} new advisories found`;

  const blocks: object[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText, emoji: true },
    },
  ];

  if (fixed.length > 0) {
    blocks.push(...buildAdvisorySections(`*✅ Fixed (${fixed.length}):*`, fixed));
  }

  if (manual.length > 0) {
    blocks.push(...buildAdvisorySections(`*⚠️ Needs manual review (${manual.length}):*`, manual));
  }

  const links: string[] = [];
  if (issueUrl) links.push(`<${issueUrl}|View tracking issue>`);
  if (runUrl) links.push(`<${runUrl}|View workflow run>`);
  if (links.length > 0) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: links.join(' | ') } });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `cc ${mentions.join(' ')} — see .github/audit-owners.yml for the escalation process.`,
        },
      ],
    },
  );

  return { blocks, text: headerText };
}

/**
 * A deliberately minimal alert for when an infra step (e.g. a GitHub API
 * call) fails partway through — see the SLACK_STAGE doc comment above for
 * why this exists. Unlike buildResultMessage, this never depends on
 * audit-fix-result.json, since the failure it's reporting is often exactly
 * why that file's later state was never reached.
 */
export function buildFailureMessage({
  failedStep,
  runUrl,
  ownerSlackId,
  managerSlackId,
}: {
  failedStep: string;
  runUrl: string;
  ownerSlackId: string;
  managerSlackId?: string;
}): SlackPayload {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const headerText = '🚨 Dependency audit escalation hit an error';

  const blocks: object[] = [
    { type: 'header', text: { type: 'plain_text', text: headerText, emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `The "${failedStep || 'an unknown step'}" step failed, so this run could not finish triaging the advisories it detected — no tracking issue or final summary was produced for them.`,
      },
    },
  ];

  if (runUrl) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `<${runUrl}|View the failed run>` } });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `cc ${mentions.join(' ')} — this needs manual follow-up; re-running the workflow may be enough if this was transient.`,
        },
      ],
    },
  );

  return { blocks, text: headerText };
}

async function postToSlack(
  botToken: string,
  channelId: string,
  payload: SlackPayload,
  threadTs?: string,
): Promise<{ success: boolean; ts?: string }> {
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
        ...(threadTs ? { thread_ts: threadTs } : {}),
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    console.log('✅ Slack notification sent successfully');
    // `data.ts` is caller-written to disk (see SLACK_MESSAGE_TS_PATH in
    // main()) and later shell-read back into a GitHub Actions output, so it
    // must never be trusted as-is (flagged by CodeQL as js/http-to-file-access
    // — writing raw network response data to a file). Only hand back a `ts`
    // that matches Slack's own timestamp shape; anything else is dropped
    // rather than persisted, same as if Slack hadn't returned one at all.
    const ts = typeof data.ts === 'string' && SLACK_TS_PATTERN.test(data.ts) ? data.ts : undefined;
    return { success: true, ts };
  } catch (error) {
    console.error(`❌ Failed to post to Slack: ${(error as Error).message}`);
    return { success: false };
  }
}

/** Throws if `value` is nullish — used below once required env vars have already been validated present. */
function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} was required but missing at this point`);
  return value;
}

export async function main(): Promise<void> {
  const dryRunEnv = process.env.SLACK_AUDIT_NOTIFICATION_DRY_RUN;
  const isDryRun = dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';
  const rawStage = process.env.SLACK_STAGE || '';
  const stage = rawStage === 'detected' || rawStage === 'failure' ? rawStage : 'result';

  // "failure" intentionally never depends on AUDIT_RESULT_PATH — see the
  // SLACK_STAGE doc comment above.
  const requiredEnvVars =
    stage === 'failure'
      ? isDryRun
        ? []
        : ['SLACK_BOT_TOKEN']
      : isDryRun
        ? ['AUDIT_RESULT_PATH']
        : ['AUDIT_RESULT_PATH', 'SLACK_BOT_TOKEN'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const ownersPath = process.env.OWNERS_YML_PATH || DEFAULT_OWNERS_PATH;
  const owners = loadOwners(ownersPath);

  let payload: SlackPayload;
  if (stage === 'failure') {
    payload = buildFailureMessage({
      failedStep: process.env.FAILED_STEP || '',
      runUrl: process.env.RUN_URL || '',
      ownerSlackId: owners.owner.slack_id,
      managerSlackId: owners.manager?.slack_id,
    });
  } else {
    const { fixed, manual } = loadAuditResult(requireEnv(process.env.AUDIT_RESULT_PATH, 'AUDIT_RESULT_PATH'));

    if (fixed.length === 0 && manual.length === 0) {
      console.log('No advisories to report — skipping Slack notification.');
      return;
    }

    payload =
      stage === 'detected'
        ? buildDetectedMessage({
            count: fixed.length + manual.length,
            runUrl: process.env.RUN_URL || '',
            ownerSlackId: owners.owner.slack_id,
            managerSlackId: owners.manager?.slack_id,
          })
        : buildResultMessage({
            fixed,
            manual,
            issueUrl: process.env.ISSUE_URL || '',
            runUrl: process.env.RUN_URL || '',
            ownerSlackId: owners.owner.slack_id,
            managerSlackId: owners.manager?.slack_id,
          });
  }

  if (isDryRun) {
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify({ channel: owners.slack_channel, stage, threadTs: process.env.SLACK_THREAD_TS || null, ...payload }, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  const result = await postToSlack(
    requireEnv(process.env.SLACK_BOT_TOKEN, 'SLACK_BOT_TOKEN'),
    owners.slack_channel,
    payload,
    process.env.SLACK_THREAD_TS,
  );
  if (!result.success) {
    console.log('⚠️ Slack notification failed but continuing (non-critical)');
    return;
  }
  if (result.ts) {
    fs.writeFileSync(process.env.SLACK_MESSAGE_TS_PATH || 'slack-message-ts.txt', result.ts);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  // Fail open on errors: a Slack notification is never critical enough to
  // fail the workflow over.
  main().catch((error) => {
    console.error('⚠️ Unexpected error (non-critical):', error);
  });
}
