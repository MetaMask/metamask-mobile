/**
 * Dependency Audit Escalation Slack Notification
 *
 * Posts a Slack message when the daily dependency-audit-escalation workflow
 * finds new production advisories, tagging the audit owner and, if
 * configured, their manager (see .github/audit-owners.yml and
 * docs/readme/dependency-audit.md).
 *
 * Required env: SLACK_BOT_TOKEN, AUDIT_RESULT_PATH
 * Optional env: OWNERS_YML_PATH (default .github/audit-owners.yml),
 *               PR_URL, AI_PR_URL, ISSUE_URL, RUN_URL,
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
 * @param {object} options
 * @returns {{blocks: object[], text: string}}
 */
function buildSlackMessage({ fixed, manual, prUrl, aiPrUrl, issueUrl, runUrl, ownerSlackId, managerSlackId }) {
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
        text: `*✅ Auto-fixed (${fixed.length}):*\n${fixed.map(advisoryLine).join('\n')}`,
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
  if (aiPrUrl) links.push(`<${aiPrUrl}|View AI-assisted fix PR>`);
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
          text: `cc ${mentions.join(' ')} — see docs/readme/dependency-audit.md for the escalation process and SLA.`,
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
 * @returns {Promise<{success: boolean}>}
 */
async function postToSlack(botToken, channelId, payload) {
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
    console.error(`❌ Failed to post to Slack: ${error.message}`);
    return { success: false };
  }
}

async function main() {
  const dryRunEnv = process.env.SLACK_AUDIT_NOTIFICATION_DRY_RUN;
  const isDryRun = dryRunEnv === '1' || String(dryRunEnv).toLowerCase() === 'true';

  const requiredEnvVars = isDryRun ? ['AUDIT_RESULT_PATH'] : ['AUDIT_RESULT_PATH', 'SLACK_BOT_TOKEN'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Skipping Slack notification (non-critical)');
    return;
  }

  const ownersPath = process.env.OWNERS_YML_PATH || DEFAULT_OWNERS_PATH;
  const owners = loadOwners(ownersPath);
  const { fixed, manual } = loadAuditResult(process.env.AUDIT_RESULT_PATH);

  if (fixed.length === 0 && manual.length === 0) {
    console.log('No advisories to report — skipping Slack notification.');
    return;
  }

  const payload = buildSlackMessage({
    fixed,
    manual,
    prUrl: process.env.PR_URL || '',
    aiPrUrl: process.env.AI_PR_URL || '',
    issueUrl: process.env.ISSUE_URL || '',
    runUrl: process.env.RUN_URL || '',
    ownerSlackId: owners.owner.slack_id,
    managerSlackId: owners.manager?.slack_id,
  });

  if (isDryRun) {
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify({ channel: owners.slack_channel, ...payload }, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  const result = await postToSlack(process.env.SLACK_BOT_TOKEN, owners.slack_channel, payload);
  if (!result.success) {
    console.log('⚠️ Slack notification failed but continuing (non-critical)');
  }
}

// Run - fail open on errors (non-critical notification)
main().catch((error) => {
  console.error('⚠️ Unexpected error (non-critical):', error);
});
