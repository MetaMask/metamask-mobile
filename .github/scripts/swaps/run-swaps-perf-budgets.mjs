#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * GitHub Actions entrypoint for swaps-perf-budgets.mjs. Exits 1 when any
 * Sentry query failed, after posting the other results.
 */

import { MIN_SAMPLES } from './swaps-perf-budgets.config.mjs';
import {
  buildSlackMessage,
  resultLine,
  runBudgetCheck,
  startOfTodayUtc,
} from './swaps-perf-budgets.mjs';

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === 'true';
  const { SWAPS_SENTRY_TOKEN: token, SWAPS_PERF_SLACK_WEBHOOK: webhook } = env;
  if (!token) {
    throw new Error('SWAPS_SENTRY_TOKEN is not set');
  }
  if (!dryRun && !webhook) {
    throw new Error('SWAPS_PERF_SLACK_WEBHOOK is not set (or run with DRY_RUN=true)');
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

  const message = buildSlackMessage(results, { runUrl: env.GITHUB_RUN_URL || '' });
  if (!message) {
    console.log('\nEvery rule is within its guardrail; no Slack post.');
  } else if (dryRun) {
    console.log(`\nDry run; would post to Slack:\n\n${message}`);
  } else {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ text: message }),
    });
    if (!response.ok) {
      throw new Error(`Slack webhook HTTP ${response.status}`);
    }
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
