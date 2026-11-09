#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * GitHub Actions entrypoint for swaps-perf-budgets.mjs. Exits 1 when any
 * Sentry query failed, after posting the other results.
 * `--failure-notice` posts only the "check failed" message.
 */

import { MIN_SAMPLES, SLACK_CHANNEL_ID } from './swaps-perf-budgets.config.mjs';
import {
  buildSlackMessage,
  resultLine,
  runBudgetCheck,
  startOfTodayUtc,
} from './swaps-perf-budgets.mjs';

/** chat.postMessage reports errors as HTTP 200 with `ok: false`. */
async function postToSlack(token, text) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text,
      unfurl_links: false,
      unfurl_media: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Slack chat.postMessage HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body.ok) {
    throw new Error(`Slack chat.postMessage failed: ${body.error || 'unknown error'}`);
  }
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === 'true';
  const { SWAPS_SENTRY_TOKEN: token, SLACK_BOT_TOKEN: slackToken } = env;
  const runUrl = env.GITHUB_RUN_URL || '';
  if (!dryRun && !slackToken) {
    throw new Error('SLACK_BOT_TOKEN is not set (or run with DRY_RUN=true)');
  }

  if (process.argv.includes('--failure-notice')) {
    const notice = `*Swaps performance budgets: the daily check failed*, so today's results may be missing or incomplete. Run: ${runUrl}`;
    if (dryRun) {
      console.log(`Dry run; would post to Slack:\n\n${notice}`);
    } else {
      await postToSlack(slackToken, notice);
    }
    return;
  }

  if (!token) {
    throw new Error('SWAPS_SENTRY_TOKEN is not set');
  }

  const { window, results, errors } = await runBudgetCheck({
    todayEnd: startOfTodayUtc(),
    token,
  });
  console.log(`Swaps performance budgets, ${window.label}, minimum n ${MIN_SAMPLES.toLocaleString('en-US')}`);
  for (const result of results) {
    console.log(`- [${result.status}] ${resultLine(result)}`);
  }
  errors.forEach((error) => console.error(`- [error] ${error}`));

  const message = buildSlackMessage(results, { runUrl });
  if (!message) {
    console.log('\nEvery rule is within its guardrail; no Slack post.');
  } else if (dryRun) {
    console.log(`\nDry run; would post to Slack:\n\n${message}`);
  } else {
    await postToSlack(slackToken, message);
    console.log('\nPosted to Slack.');
  }

  if (errors.length > 0) {
    throw new Error(`${errors.length} Sentry queries failed`);
  }
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
