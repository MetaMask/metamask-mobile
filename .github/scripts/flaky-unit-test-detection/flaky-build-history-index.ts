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
  MAX_GRAPHQL_QUERIES_PER_BUILD,
  newWalkBudget,
  walkDay,
} from './flaky-history-walk';
import type { HistoryIndex } from './flaky-types';

const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();
const INDEX_DIR = join(WORKSPACE_ROOT, '.flaky-history-index');
export const INDEX_FILENAME = 'flaky-history-index.json';

const env = {
  repo: process.env.GITHUB_REPOSITORY ?? '',
  token: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? '',
  /** Where the download step put the previous build's artifact, if any. */
  priorIndexPath: process.env.FLAKY_PRIOR_INDEX_PATH ?? '',
  /** A manual backfill width; the nightly leaves this unset. */
  backfillDays: Number(process.env.FLAKY_BACKFILL_DAYS ?? '0'),
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

export function renderBuildSummary({
  daysWalked,
  gapDays,
  runsScanned,
  newHits,
  index,
  today,
}: {
  daysWalked: string[];
  gapDays: string[];
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
  const octokit = getOctokit(env.token);
  const today = toDayKey(new Date());

  const prior = loadPriorIndex(env.priorIndexPath);
  const days = daysToWalk({
    index: prior,
    today,
    // Clamped because a dispatch asking for more days than the GraphQL budget
    // covers would walk them all badly and record most of them as gaps.
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

  // An even share, so one unusually busy day cannot starve the rest.
  const maxQueriesForDay = Math.max(
    2,
    Math.floor(MAX_GRAPHQL_QUERIES_PER_BUILD / Math.max(days.length, 1)),
  );

  for (const day of days) {
    const result = await walkDay({
      octokit,
      owner,
      repo,
      day,
      budget,
      maxQueriesForDay,
    });
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
    daysWalked: days,
    gapDays,
    runsScanned,
    newHits,
    index,
    today,
  });
  if (process.env.GITHUB_STEP_SUMMARY) {
    mkdirSync(dirname(process.env.GITHUB_STEP_SUMMARY), { recursive: true });
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
  }
  core.setOutput('days_walked', String(days.length));
  core.setOutput('gap_days', String(gapDays.length));
  core.setOutput('tests_tracked', String(Object.keys(index.entries).length));

  // A build that walked nothing it was asked to walk has not moved the index
  // forward, and a silent nightly is how an index rots unnoticed.
  if (days.length > 0 && gapDays.length === days.length) {
    core.setFailed(
      `Every one of the ${days.length} day(s) this build walked was left incomplete.`,
    );
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    core.setFailed(`Index build failed: ${error.message}`);
  });
}
