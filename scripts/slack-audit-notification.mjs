/**
 * Dependency Audit Escalation Slack Notification
 *
 * Posts a Slack message when the dependency-audit-escalation workflow
 * finds new production advisories, tagging the audit owner and, if
 * configured, their manager (see .github/audit-owners.yml).
 *
 * Runs in one of three stages, controlled by SLACK_STAGE, so the owner gets a
 * heads-up as soon as new advisories are found instead of only learning
 * about them once a PR already exists (which can be a few minutes later,
 * once the AI-assisted fix step has had a chance to run):
 *   - "detected" (posted right after advisories are collected, before the AI
 *     step or any PR runs): announces how many new advisories were found,
 *     with a link to the running workflow.
 *   - "result" (default; posted once the fix attempt and any tracking issue
 *     are done): the final summary with links to whichever of the fix PR /
 *     tracking issue actually got created.
 *   - "failure" (posted when an infra step — e.g. Get token — fails after
 *     "detected" already went out): by default GitHub Actions skips every
 *     step after a failed one unless that step's own dependencies already
 *     ran, which meant a Get token failure used to leave the owner with a
 *     "detected" message and then silence, with no indication anything had
 *     gone wrong. This is a minimal alert, not a full result summary — it
 *     doesn't require AUDIT_RESULT_PATH, since the whole point is to fire
 *     even when the steps that produce that file's later state didn't run.
 * The "result"/"failure" messages are posted as a threaded reply to the
 * "detected" message when SLACK_THREAD_TS is set, so all land in one place.
 *
 * Required env: SLACK_BOT_TOKEN, AUDIT_RESULT_PATH (not required for "failure")
 * Optional env: OWNERS_YML_PATH (default .github/audit-owners.yml),
 *               SLACK_STAGE ("detected" | "result" | "failure", default "result"),
 *               SLACK_THREAD_TS (reply in this thread instead of posting top-level),
 *               SLACK_MESSAGE_TS_PATH (default slack-message-ts.txt; where this
 *               run's message timestamp is written, so a later "result" call
 *               can thread off of it),
 *               PR_URL, ISSUE_URL, RUN_URL, FAILED_STEP,
 *               SLACK_AUDIT_NOTIFICATION_DRY_RUN
 */

import fs from 'fs';
import yaml from 'js-yaml';

const DEFAULT_OWNERS_PATH = '.github/audit-owners.yml';

/**
 * @param {string} path
 * @returns {{slack_channel: string, owner: {github: string, slack_id: string}, manager?: {slack_id: string}, sla_days: number}}
 */
function loadOwners(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = yaml.load(raw);
  if (!parsed?.slack_channel || !parsed?.owner?.slack_id) {
    throw new Error(`${path} is missing slack_channel or owner.slack_id`);
  }
  return parsed;
}

/**
 * @param {string} path
 * @returns {{fixed: Array<object>, manual: Array<object>}}
 */
function loadAuditResult(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  return { fixed: parsed.fixed ?? [], manual: parsed.manual ?? [] };
}

function advisoryLine(entry) {
  const link = entry.url ? `<${entry.url}|${entry.id}>` : entry.id;
  return `• *${entry.pkg}* (${entry.severity}) — ${link}: ${entry.title}`;
}

/**
 * The "we just found something and are working on it" message, posted before
 * the AI-assisted fix step runs or any PR exists — see the SLACK_STAGE doc
 * comment above.
 * @param {object} options
 * @returns {{blocks: object[], text: string}}
 */
function buildDetectedMessage({ count, runUrl, ownerSlackId, managerSlackId }) {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const headerText = count === 1
    ? '🔎 Dependency audit: 1 new advisory detected'
    : `🔎 Dependency audit: ${count} new advisories detected`;

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: headerText, emoji: true } },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `🤖 Escalating to AI-assisted review now (MetaMask/ai-analyzer proposes a fix, which is then independently applied and re-verified before being trusted).` },
    },
  ];

  if (runUrl) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `<${runUrl}|Watch the run> — I'll reply in this thread once a PR or tracking issue is ready.` },
    });
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `cc ${mentions.join(' ')} — see .github/audit-owners.yml for the escalation process and SLA.`,
        },
      ],
    },
  );

  return { blocks, text: headerText };
}

/**
 * The final "here's what happened" message, posted once the fix attempt and
 * any tracking issue are done — see the SLACK_STAGE doc comment above.
 * @param {object} options
 * @returns {{blocks: object[], text: string}}
 */
function buildResultMessage({ fixed, manual, prUrl, issueUrl, runUrl, ownerSlackId, managerSlackId }) {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const total = fixed.length + manual.length;
  const headerText = total === 1
    ? '🔒 Dependency audit: 1 new advisory found'
    : `🔒 Dependency audit: ${total} new advisories found`;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText, emoji: true },
    },
  ];

  if (fixed.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*✅ Fixed (AI-proposed, independently verified) (${fixed.length}):*\n${fixed.map(advisoryLine).join('\n')}`,
      },
    });
  }

  if (manual.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*⚠️ Needs manual review (${manual.length}):*\n${manual.map(advisoryLine).join('\n')}`,
      },
    });
  }

  const links = [];
  if (prUrl) links.push(`<${prUrl}|View fix PR>`);
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
          text: `cc ${mentions.join(' ')} — see .github/audit-owners.yml for the escalation process and SLA.`,
        },
      ],
    },
  );

  return { blocks, text: headerText };
}

/**
 * A deliberately minimal alert for when an infra step (e.g. Get token) fails
 * partway through — see the SLACK_STAGE doc comment above for why this
 * exists. Unlike buildResultMessage, this never depends on
 * audit-fix-result.json, since the failure it's reporting is often exactly
 * why that file's later state was never reached.
 * @param {object} options
 * @returns {{blocks: object[], text: string}}
 */
function buildFailureMessage({ failedStep, runUrl, ownerSlackId, managerSlackId }) {
  const mentions = [`<@${ownerSlackId}>`];
  if (managerSlackId) mentions.push(`<@${managerSlackId}>`);

  const headerText = '🚨 Dependency audit escalation hit an error';

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: headerText, emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `The "${failedStep || 'an unknown step'}" step failed, so this run could not finish triaging the advisories it detected — no fix PR, tracking issue, or final summary was produced for them.`,
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

/**
 * @param {string} botToken
 * @param {string} channelId
 * @param {{blocks: object[], text: string}} payload
 * @param {string} [threadTs] - reply in this thread instead of posting top-level
 * @returns {Promise<{success: boolean, ts?: string}>}
 */
async function postToSlack(botToken, channelId, payload, threadTs) {
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
    return { success: true, ts: data.ts };
  } catch (error) {
    console.error(`❌ Failed to post to Slack: ${error.message}`);
    return { success: false };
  }
}

async function main() {
  const dryRunEnv = process.env.SLACK_AUDIT_NOTIFICATION_DRY_RUN;
  const isDryRun = dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';
  const stage = ['detected', 'failure'].includes(process.env.SLACK_STAGE) ? process.env.SLACK_STAGE : 'result';

  // "failure" intentionally never depends on AUDIT_RESULT_PATH — see the
  // SLACK_STAGE doc comment above.
  const requiredEnvVars = stage === 'failure'
    ? (isDryRun ? [] : ['SLACK_BOT_TOKEN'])
    : (isDryRun ? ['AUDIT_RESULT_PATH'] : ['AUDIT_RESULT_PATH', 'SLACK_BOT_TOKEN']);
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const ownersPath = process.env.OWNERS_YML_PATH || DEFAULT_OWNERS_PATH;
  const owners = loadOwners(ownersPath);

  let payload;
  if (stage === 'failure') {
    payload = buildFailureMessage({
      failedStep: process.env.FAILED_STEP || '',
      runUrl: process.env.RUN_URL || '',
      ownerSlackId: owners.owner.slack_id,
      managerSlackId: owners.manager?.slack_id,
    });
  } else {
    const { fixed, manual } = loadAuditResult(process.env.AUDIT_RESULT_PATH);

    if (fixed.length === 0 && manual.length === 0) {
      console.log('No advisories to report — skipping Slack notification.');
      return;
    }

    payload = stage === 'detected'
      ? buildDetectedMessage({
        count: fixed.length + manual.length,
        runUrl: process.env.RUN_URL || '',
        ownerSlackId: owners.owner.slack_id,
        managerSlackId: owners.manager?.slack_id,
      })
      : buildResultMessage({
        fixed,
        manual,
        prUrl: process.env.PR_URL || '',
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

  const result = await postToSlack(process.env.SLACK_BOT_TOKEN, owners.slack_channel, payload, process.env.SLACK_THREAD_TS);
  if (!result.success) {
    console.log('⚠️ Slack notification failed but continuing (non-critical)');
    return;
  }
  if (result.ts) {
    fs.writeFileSync(process.env.SLACK_MESSAGE_TS_PATH || 'slack-message-ts.txt', result.ts);
  }
}

// Run - fail open on errors (non-critical notification)
main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
});
