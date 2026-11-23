/**
 * Builds the nightly flaky history index on main.
 *
 * Loads the previous build's artifact, walks the days that artifact does not
 * cover, folds the results in and publishes the result. Splitting it out of
 * the PR workflow is what makes the history signal affordable: the walk costs
 * the same as it always did, but it runs once a night instead of on every
 * push, and it reads job logs while they are hours old rather than weeks.
 *
 * The chain is the thing to protect. Every build merges into the one before
 * it, so an index this code cannot safely extend is discarded in favour of a
 * backfill rather than carried forward.
 */
import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  daysToWalk,
  emptyIndex,
  indexCoverage,
  indexTotals,
  markGapDay,
  mergeDayHits,
  parseIndex,
  pruneToRetention,
  toDayKey,
  MAX_BACKFILL_DAYS,
  RETENTION_DAYS,
} from './flaky-history-index';
import {
  DEFAULT_WALK_DEADLINE_MINUTES,
  MAX_DAYS_PER_BUILD,
  newWalkBudget,
  orderDaysForWalk,
  requestShareForDay,
  walkDay,
} from './flaky-history-walk';
import type { HistoryIndex } from './flaky-types';

const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const INDEX_DIR = join(WORKSPACE_ROOT, '.flaky-history-index');
export const INDEX_FILENAME = 'flaky-history-index.json';

function positiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * A request that never answers would hold the whole nightly until the job
 * timeout cancels it, losing everything the walk had already found. Octokit
 * reports an aborted fetch as a retriable 500, which the walk already handles.
 */
const REQUEST_TIMEOUT_MS = 90_000;

export function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): ReturnType<typeof fetch> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

const env = {
  repo: process.env.GITHUB_REPOSITORY ?? '',
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '',
  /** Where the download step put the previous build's artifact, if any. */
  priorIndexPath: process.env.FLAKY_PRIOR_INDEX_PATH ?? '',
  /** A manual backfill width; the nightly leaves this unset. */
  backfillDays: Number(process.env.FLAKY_BACKFILL_DAYS ?? '0'),
  /** Minutes after which the walk stops starting work and saves what it has. */
  deadlineMinutes: positiveNumber(
    process.env.FLAKY_WALK_DEADLINE_MINUTES,
    DEFAULT_WALK_DEADLINE_MINUTES,
  ),
  /** Days one build attempts; the rest are queued as gaps for later nights. */
  maxDays: positiveNumber(
    process.env.FLAKY_MAX_DAYS_PER_BUILD,
    MAX_DAYS_PER_BUILD,
  ),
};

/**
 * A prior index that cannot be read is not an error: the build falls back to a
 * cold start, which costs a backfill window rather than the whole history.
 */
export function loadPriorIndex(path: string): HistoryIndex {
  if (path === '' || !existsSync(path)) {
    core.info('No prior index artifact; starting from a backfill.');
    return emptyIndex();
  }
  const parsed = parseIndex(readFileSync(path, 'utf8'));
  if (!parsed) {
    core.warning(
      `Prior index at ${path} is not a shape this build can extend; starting from a backfill.`,
    );
    return emptyIndex();
  }
  return parsed;
}

/**
 * A day older than the index's newest day that this build did not reach would
 * otherwise vanish: the next build resumes after the newest day. Queuing it as
 * a gap is what lets a night that fell behind catch up over several builds.
 * Days newer than the newest day need no entry, the next build walks them as
 * fresh days.
 */
export function queueDeferredDaysAsGaps(
  index: HistoryIndex,
  deferredDays: readonly string[],
): HistoryIndex {
  return deferredDays
    .filter((day) => index.newestDay !== '' && day < index.newestDay)
    .reduce(markGapDay, index);
}

export function renderBuildSummary({
  daysWalked,
  gapDays,
  deferredDays = [],
  runsScanned,
  newHits,
  index,
  today,
}: {
  daysWalked: string[];
  gapDays: string[];
  deferredDays?: string[];
  runsScanned: number;
  newHits: number;
  index: HistoryIndex;
  today: string;
}): string {
  const coverage = indexCoverage(index, today);
  const totals = indexTotals(index);
  const window =
    coverage.daysCovered > 0
      ? `${index.oldestDay} to ${index.newestDay}, ${coverage.daysCovered} day(s)`
      : 'empty';
  return [
    '## Flaky history index',
    '',
    '| Item | Value |',
    '| --- | --- |',
    `| Days walked | ${daysWalked.length > 0 ? daysWalked.join(', ') : 'none, already up to date'} |`,
    `| Days left as gaps | ${gapDays.length > 0 ? gapDays.join(', ') : 'none'} |`,
    `| Days deferred | ${deferredDays.length > 0 ? deferredDays.join(', ') : 'none'} |`,
    `| ci.yml runs scanned | ${runsScanned} |`,
    `| Fail-then-pass hits found | ${newHits} |`,
    `| Tests tracked | ${Object.keys(index.entries).length} |`,
    `| Index window | ${window} |`,
    `| Missing log blobs | ${totals.missingLogBlobs} |`,
    `| Lost runners | ${totals.infrastructureFailures} |`,
    `| Unattributed re-runs | ${totals.unattributedReruns} |`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  if (env.token === '' || env.repo === '') {
    core.setFailed('Missing GITHUB_TOKEN or GITHUB_REPOSITORY.');
    return;
  }
  const [owner, repo] = env.repo.split('/');
  const octokit = getOctokit(env.token, {
    request: { fetch: fetchWithTimeout },
  });
  const startedAt = Date.now();
  const deadlineMs = startedAt + env.deadlineMinutes * 60_000;
  const today = toDayKey(new Date());

  const prior = loadPriorIndex(env.priorIndexPath);
  const days = daysToWalk({
    index: prior,
    today,
    // Clamped because a dispatch asking for more days than one hourly budget
    // can finish would walk them all badly and record most of them as gaps.
    maxBackfill:
      env.backfillDays > 0
        ? Math.min(env.backfillDays, MAX_BACKFILL_DAYS)
        : MAX_BACKFILL_DAYS,
  });
  core.info(
    `Index covers ${prior.oldestDay || 'nothing'} to ${prior.newestDay || 'nothing'}; walking ${days.length} day(s).`,
  );

  const budget = newWalkBudget();
  let index = prior;
  let runsScanned = 0;
  let newHits = 0;
  const gapDays: string[] = [];
  const deferredDays: string[] = [];
  const attempted: string[] = [];

  // Newest first, so the days a build cannot reach are the oldest and the index
  // keeps tracking yesterday.
  const ordered = orderDaysForWalk(days, prior.gapDays);
  const dayCap = Math.max(1, Math.floor(env.maxDays));

  for (const [position, day] of ordered.entries()) {
    const maxRequestsForDay = requestShareForDay({
      spent: budget.restRequests,
    });
    if (position >= dayCap) {
      deferredDays.push(day);
      core.info(`${day}: deferred, ${dayCap} day(s) per build reached`);
      continue;
    }
    if (Date.now() >= deadlineMs) {
      deferredDays.push(day);
      core.info(`${day}: deferred, ${env.deadlineMinutes}m walk deadline passed`);
      continue;
    }
    if (maxRequestsForDay <= 0) {
      deferredDays.push(day);
      core.info(`${day}: deferred, REST budget exhausted`);
      continue;
    }
    attempted.push(day);
    let result: Awaited<ReturnType<typeof walkDay>>;
    try {
      result = await walkDay({
        octokit,
        owner,
        repo,
        day,
        budget,
        maxRequestsForDay,
        deadlineMs,
      });
    } catch (error) {
      // One day failing outright must not discard the days already walked.
      core.warning(`${day}: walk threw, left as a gap: ${(error as Error).message}`);
      index = markGapDay(index, day);
      gapDays.push(day);
      continue;
    }
    runsScanned += result.runsScanned;
    newHits += result.hits.length;

    index = mergeDayHits({
      index,
      day,
      hits: result.hits,
      runsScanned: result.runsScanned,
      missingLogBlobs: result.missingLogBlobs,
      infrastructureFailures: result.infrastructureFailures,
      unattributedReruns: result.unattributedReruns,
    });
    // Recorded after the merge, which clears the day: an incomplete walk still
    // contributes what it found, but the day stays queued for a re-walk.
    if (!result.complete) {
      index = markGapDay(index, day);
      gapDays.push(day);
    }
    core.info(
      `${day}: ${result.runsScanned} run(s), ${result.hits.length} hit(s)${result.complete ? '' : ', incomplete'}`,
    );
  }

  index = queueDeferredDaysAsGaps(index, deferredDays);

  index = pruneToRetention(
    { ...index, builtAt: new Date().toISOString() },
    today,
    RETENTION_DAYS,
  );

  mkdirSync(INDEX_DIR, { recursive: true });
  const outputPath = join(INDEX_DIR, INDEX_FILENAME);
  writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`);
  core.info(`Wrote ${outputPath}`);

  const summary = renderBuildSummary({
    daysWalked: attempted,
    gapDays,
    deferredDays,
    runsScanned,
    newHits,
    index,
    today,
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    mkdirSync(dirname(process.env.GITHUB_STEP_SUMMARY), { recursive: true });
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  }
  core.setOutput('days_walked', String(attempted.length));
  core.setOutput('gap_days', String(gapDays.length));
  core.setOutput('tests_tracked', String(Object.keys(index.entries).length));

  // A silent nightly is how an index rots unnoticed, so a build that learned
  // nothing at all fails. A build that read runs but could not finish a day has
  // still moved the index forward — it advanced the newest day, kept the hits it
  // found and queued the day for a re-walk — and publishing that is what lets a
  // backlog drain instead of failing every night until the API is healthy.
  const outcome = buildOutcome({
    attemptedDays: attempted.length,
    gapDays: gapDays.length,
    runsScanned,
  });
  if (outcome === 'warn') {
    core.warning(
      `Every one of the ${attempted.length} day(s) this build walked was left incomplete; the index was still extended and the days stay queued as gaps.`,
    );
  }
  if (outcome === 'fail') {
    core.setFailed(
      `Every one of the ${attempted.length} day(s) this build walked was left incomplete and no run could be read.`,
    );
  }
}

export function buildOutcome({
  attemptedDays,
  gapDays,
  runsScanned,
}: {
  attemptedDays: number;
  gapDays: number;
  runsScanned: number;
}): 'ok' | 'warn' | 'fail' {
  // Deferred days were not walked, so they count as neither success nor failure.
  if (attemptedDays === 0 || gapDays < attemptedDays) {
    return 'ok';
  }
  return runsScanned > 0 ? 'warn' : 'fail';
}

if (require.main === module) {
  main().catch((error: Error) => {
    core.setFailed(`Index build failed: ${error.message}`);
  });
}
