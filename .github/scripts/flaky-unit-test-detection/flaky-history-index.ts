/**
 * The nightly history index: what it holds, how a day's hits fold into it, and
 * when it is still worth believing.
 *
 * Every build merges into the previous build's artifact, so this file is the
 * one place that decides what a trustworthy index looks like. A shape it
 * cannot safely extend is rejected outright rather than carried forward, since
 * a bad merge would otherwise propagate through every night that follows.
 */
import type {
  CoverageWindow,
  HistoryIndex,
  HistoryIndexEntry,
  IndexDayCount,
  IndexDayStats,
  IndexTotals,
  UnattributedRerun,
} from './flaky-types';

/** Bump only for a change that older builds could not have produced. */
export const INDEX_VERSION = 1;

/** How far back the index keeps day buckets. Matches the artifact retention. */
export const RETENTION_DAYS = 90;

/**
 * What one run can rebuild from nothing. GITHUB_TOKEN allows 1000 GraphQL
 * points per hour per repository and a 14-day window costs roughly 460, so a
 * cold start fits while a full-window rebuild never would.
 */
export const MAX_BACKFILL_DAYS = 14;

/** Enough to keep the disclosure line useful without bloating the artifact. */
const MAX_DISCLOSED_RERUNS = 10;

/** A confirmed fail-then-pass the builder attributed to a test file. */
export type DayHit = {
  path: string;
  runId: number;
  jobId: number;
};

export function emptyIndex(): HistoryIndex {
  return {
    version: INDEX_VERSION,
    builtAt: '',
    oldestDay: '',
    newestDay: '',
    gapDays: [],
    days: [],
    entries: {},
    unattributedReruns: [],
  };
}

/**
 * The counters the comment quotes as "in this window", summed over the days
 * still inside it. Derived rather than stored so pruning a day removes its
 * contribution without anything else having to remember to.
 */
export function indexTotals(index: HistoryIndex): IndexTotals {
  return index.days.reduce<IndexTotals>(
    (totals, day) => ({
      runsScanned: totals.runsScanned + day.runsScanned,
      missingLogBlobs: totals.missingLogBlobs + day.missingLogBlobs,
      infrastructureFailures:
        totals.infrastructureFailures + day.infrastructureFailures,
      unattributedReruns: totals.unattributedReruns + day.unattributedReruns,
    }),
    {
      runsScanned: 0,
      missingLogBlobs: 0,
      infrastructureFailures: 0,
      unattributedReruns: 0,
    },
  );
}

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDayKey(date);
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function daysInRange(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; daysBetween(day, to) >= 0; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

function sumDays(days: IndexDayCount[]): number {
  return days.reduce((total, day) => total + day.count, 0);
}

export type MergeDayInput = {
  index: HistoryIndex;
  day: string;
  hits: DayHit[];
  runsScanned: number;
  missingLogBlobs?: number;
  infrastructureFailures?: number;
  unattributedReruns?: UnattributedRerun[];
};

/**
 * Folds one walked day into the index. Re-walking a day replaces that day's
 * counts rather than adding to them, so a re-run of the builder over a day it
 * already covered cannot double what it finds.
 */
export function mergeDayHits({
  index,
  day,
  hits,
  runsScanned,
  missingLogBlobs = 0,
  infrastructureFailures = 0,
  unattributedReruns = [],
}: MergeDayInput): HistoryIndex {
  const countsByPath = new Map<string, DayHit[]>();
  for (const hit of hits) {
    const forPath = countsByPath.get(hit.path) ?? [];
    forPath.push(hit);
    countsByPath.set(hit.path, forPath);
  }

  const entries: Record<string, HistoryIndexEntry> = {};
  for (const [path, entry] of Object.entries(index.entries)) {
    const days = entry.days.filter((bucket) => bucket.date !== day);
    if (days.length > 0) {
      entries[path] = { ...entry, days, sameShaFailThenPass: sumDays(days) };
    }
  }

  for (const [path, pathHits] of countsByPath) {
    const existing = entries[path];
    const days = [
      ...(existing?.days ?? []),
      { date: day, count: pathHits.length },
    ].sort((a, b) => a.date.localeCompare(b.date));
    // The newest hit wins the example link, so a reader following it lands on
    // the most recent evidence rather than the oldest.
    const newest = pathHits[pathHits.length - 1];
    const keepExisting = existing && existing.lastSeen > day;
    entries[path] = {
      path,
      days,
      sameShaFailThenPass: sumDays(days),
      exampleRunId: keepExisting ? existing.exampleRunId : newest.runId,
      exampleJobId: keepExisting ? existing.exampleJobId : newest.jobId,
      lastSeen: keepExisting ? existing.lastSeen : day,
    };
  }

  const oldestDay =
    index.oldestDay === '' || day < index.oldestDay ? day : index.oldestDay;
  const newestDay = day > index.newestDay ? day : index.newestDay;

  return {
    ...index,
    version: INDEX_VERSION,
    oldestDay,
    newestDay,
    // The day was walked, so it is no longer a hole.
    gapDays: index.gapDays.filter((gap) => gap !== day),
    // Same replace-don't-add rule as the hit counts, so re-walking a day
    // cannot double what it cost or what it failed to read.
    days: [
      ...index.days.filter((stats) => stats.date !== day),
      {
        date: day,
        runsScanned,
        missingLogBlobs,
        infrastructureFailures,
        unattributedReruns: unattributedReruns.length,
      },
    ].sort((a, b) => a.date.localeCompare(b.date)),
    entries,
    unattributedReruns: [
      ...unattributedReruns,
      ...index.unattributedReruns,
    ].slice(0, MAX_DISCLOSED_RERUNS),
  };
}

/** Records a day the builder tried and failed to walk, so it is re-walked. */
export function markGapDay(index: HistoryIndex, day: string): HistoryIndex {
  if (index.gapDays.includes(day)) {
    return index;
  }
  return { ...index, gapDays: [...index.gapDays, day].sort() };
}

/**
 * Drops day buckets that fell out of the window and re-sums what is left. An
 * entry whose every bucket expired disappears: the file has no flake history
 * inside the window any more, which is the same as never having had one.
 */
export function pruneToRetention(
  index: HistoryIndex,
  today: string,
  retentionDays = RETENTION_DAYS,
): HistoryIndex {
  const cutoff = addDays(today, -(retentionDays - 1));
  const entries: Record<string, HistoryIndexEntry> = {};
  for (const [path, entry] of Object.entries(index.entries)) {
    const days = entry.days.filter((bucket) => bucket.date >= cutoff);
    if (days.length === 0) {
      continue;
    }
    entries[path] = { ...entry, days, sameShaFailThenPass: sumDays(days) };
  }

  const oldestDay =
    index.oldestDay !== '' && index.oldestDay < cutoff
      ? cutoff
      : index.oldestDay;

  return {
    ...index,
    oldestDay,
    gapDays: index.gapDays.filter((day) => day >= cutoff),
    days: index.days.filter((stats) => stats.date >= cutoff),
    entries,
  };
}

export type DaysToWalkInput = {
  index: HistoryIndex;
  today: string;
  maxBackfill?: number;
};

/**
 * The days this build should walk: everything after the index's newest day up
 * to yesterday, plus any day a previous build failed on.
 *
 * Walking "yesterday" alone would turn one failed night into a permanent hole,
 * so the range is derived from what the index actually holds. An index with no
 * days is a cold start and gets the backfill window.
 */
export function daysToWalk({
  index,
  today,
  maxBackfill = MAX_BACKFILL_DAYS,
}: DaysToWalkInput): string[] {
  const yesterday = addDays(today, -1);
  const earliestAllowed = addDays(today, -maxBackfill);

  if (index.newestDay === '') {
    return daysInRange(earliestAllowed, yesterday);
  }

  const resumeFrom = addDays(index.newestDay, 1);
  const from = resumeFrom < earliestAllowed ? earliestAllowed : resumeFrom;
  const fresh =
    daysBetween(from, yesterday) >= 0 ? daysInRange(from, yesterday) : [];
  const gaps = index.gapDays.filter(
    (day) => day >= earliestAllowed && !fresh.includes(day),
  );

  // Fresh days come first so a day that can never be walked — its runs aged
  // out of the API, say — cannot hold the window back forever by refilling the
  // budget every night. Gaps are best-effort repair with whatever is left.
  return [...fresh, ...gaps].slice(0, maxBackfill).sort();
}

/**
 * Whether a parsed artifact is an index this code can extend. Anything else is
 * discarded in favour of a backfill: chaining onto a shape we cannot reason
 * about would bake the damage into every later build.
 */
export function isUsableIndex(value: unknown): value is HistoryIndex {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const index = value as Partial<HistoryIndex>;
  if (index.version !== INDEX_VERSION) {
    return false;
  }
  if (
    typeof index.oldestDay !== 'string' ||
    typeof index.newestDay !== 'string' ||
    !Array.isArray(index.gapDays) ||
    !Array.isArray(index.days) ||
    typeof index.entries !== 'object' ||
    index.entries === null
  ) {
    return false;
  }
  if (
    !index.days.every(
      (stats: IndexDayStats) =>
        typeof stats?.date === 'string' &&
        typeof stats.runsScanned === 'number',
    )
  ) {
    return false;
  }
  return Object.values(index.entries).every(
    (entry) =>
      typeof entry?.path === 'string' &&
      Array.isArray(entry.days) &&
      entry.days.every(
        (day) => typeof day?.date === 'string' && typeof day.count === 'number',
      ),
  );
}

export function parseIndex(raw: string): HistoryIndex | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return isUsableIndex(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Named for what it answers here; it is the artifact's coverage field. */
export type IndexCoverage = CoverageWindow;

/**
 * Staleness of an index that was never built. A finite sentinel rather than
 * `Infinity`, which JSON writes as `null` — the artifact crosses a process
 * boundary, so a value that cannot survive the round trip is a value the
 * reader on the far side cannot compare against.
 */
export const UNKNOWN_STALE_DAYS = 99_999;

/**
 * A nightly build that runs after midnight covers up to yesterday, so one day
 * of staleness is the steady state rather than a problem. Two means a night
 * was missed.
 */
const MAX_FRESH_STALE_DAYS = 2;

export function indexCoverage(
  index: HistoryIndex,
  today: string,
): IndexCoverage {
  if (index.newestDay === '') {
    return {
      staleDays: UNKNOWN_STALE_DAYS,
      daysCovered: 0,
      gapDays: [],
      oldestDay: '',
      newestDay: '',
      complete: false,
    };
  }
  const staleDays = daysBetween(index.newestDay, today);
  return {
    staleDays,
    daysCovered: daysBetween(index.oldestDay, index.newestDay) + 1,
    gapDays: index.gapDays,
    oldestDay: index.oldestDay,
    newestDay: index.newestDay,
    complete: staleDays <= MAX_FRESH_STALE_DAYS && index.gapDays.length === 0,
  };
}
