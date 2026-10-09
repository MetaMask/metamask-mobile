import {
  INDEX_VERSION,
  MAX_BACKFILL_DAYS,
  daysInRange,
  daysToWalk,
  emptyIndex,
  indexCoverage,
  indexTotals,
  isUsableIndex,
  markGapDay,
  mergeDayHits,
  parseIndex,
  UNKNOWN_STALE_DAYS,
  pruneToRetention,
  type DayHit,
} from './flaky-history-index';
import type { HistoryIndex } from './flaky-types';

const FILE = 'app/core/createAsyncBatcher.test.ts';
const OTHER = 'app/util/networks/index.test.ts';

const hit = (overrides: Partial<DayHit> = {}): DayHit => ({
  path: FILE,
  runId: 100,
  jobId: 200,
  ...overrides,
});

const merge = (
  index: HistoryIndex,
  day: string,
  hits: DayHit[],
  runsScanned = 10,
): HistoryIndex => mergeDayHits({ index, day, hits, runsScanned });

describe('mergeDayHits', () => {
  it('records a day bucket and keeps the total in step with it', () => {
    const index = merge(emptyIndex(), '2026-09-10', [hit(), hit()]);

    expect(index.entries[FILE].days).toStrictEqual([
      { date: '2026-09-10', count: 2 },
    ]);
    expect(index.entries[FILE].sameShaFailThenPass).toBe(2);
  });

  it('accumulates separate days for the same path', () => {
    const first = merge(emptyIndex(), '2026-09-10', [hit()]);
    const index = merge(first, '2026-09-11', [hit(), hit()]);

    expect(index.entries[FILE].days).toStrictEqual([
      { date: '2026-09-10', count: 1 },
      { date: '2026-09-11', count: 2 },
    ]);
    expect(index.entries[FILE].sameShaFailThenPass).toBe(3);
  });

  // A builder re-run over a day it already walked must not inflate it.
  it('replaces a day rather than adding to it when re-walked', () => {
    const first = merge(emptyIndex(), '2026-09-10', [hit(), hit(), hit()]);
    const index = merge(first, '2026-09-10', [hit()]);

    expect(index.entries[FILE].sameShaFailThenPass).toBe(1);
  });

  it('drops an entry whose only day is re-walked with no hits', () => {
    const first = merge(emptyIndex(), '2026-09-10', [hit()]);
    const index = merge(first, '2026-09-10', []);

    expect(index.entries[FILE]).toBeUndefined();
  });

  it('points the example link at the newest hit', () => {
    const first = merge(emptyIndex(), '2026-09-10', [
      hit({ runId: 1, jobId: 2 }),
    ]);
    const index = merge(first, '2026-09-12', [hit({ runId: 9, jobId: 8 })]);

    expect(index.entries[FILE].exampleRunId).toBe(9);
    expect(index.entries[FILE].lastSeen).toBe('2026-09-12');
  });

  it('keeps the newer example when an older day is walked later', () => {
    const first = merge(emptyIndex(), '2026-09-12', [
      hit({ runId: 9, jobId: 8 }),
    ]);
    const index = merge(first, '2026-09-10', [hit({ runId: 1, jobId: 2 })]);

    expect(index.entries[FILE].exampleRunId).toBe(9);
    expect(index.entries[FILE].lastSeen).toBe('2026-09-12');
  });

  it('widens the covered window and counts the runs it scanned', () => {
    const first = merge(emptyIndex(), '2026-09-12', [hit()], 300);
    const index = merge(first, '2026-09-10', [hit()], 250);

    expect(index.oldestDay).toBe('2026-09-10');
    expect(index.newestDay).toBe('2026-09-12');
    expect(indexTotals(index).runsScanned).toBe(550);
  });

  // The counters are quoted in the comment as totals "in this window", so a
  // re-walk must replace a day's cost rather than add to it.
  it('replaces a day cost rather than adding to it when re-walked', () => {
    const first = merge(emptyIndex(), '2026-09-10', [hit()], 300);
    const index = merge(first, '2026-09-10', [hit()], 280);

    expect(indexTotals(index).runsScanned).toBe(280);
  });

  it('clears a gap day once it is walked', () => {
    const withGap = markGapDay(emptyIndex(), '2026-09-10');
    const index = merge(withGap, '2026-09-10', [hit()]);

    expect(index.gapDays).toStrictEqual([]);
  });

  it('keeps entries for other paths untouched', () => {
    const first = merge(emptyIndex(), '2026-09-10', [hit({ path: OTHER })]);
    const index = merge(first, '2026-09-11', [hit()]);

    expect(index.entries[OTHER].sameShaFailThenPass).toBe(1);
    expect(index.entries[FILE].sameShaFailThenPass).toBe(1);
  });
});

describe('pruneToRetention', () => {
  it('drops buckets that fell out of the window and re-sums the rest', () => {
    const first = merge(emptyIndex(), '2026-06-01', [hit()]);
    const second = merge(first, '2026-09-10', [hit(), hit()]);

    const index = pruneToRetention(second, '2026-09-21', 90);

    expect(index.entries[FILE].days).toStrictEqual([
      { date: '2026-09-10', count: 2 },
    ]);
    expect(index.entries[FILE].sameShaFailThenPass).toBe(2);
  });

  it('removes an entry whose every bucket expired', () => {
    const aged = merge(emptyIndex(), '2026-01-01', [hit()]);

    const index = pruneToRetention(aged, '2026-09-21', 90);

    expect(index.entries[FILE]).toBeUndefined();
  });

  it('pulls the window start up to the cutoff', () => {
    const aged = merge(emptyIndex(), '2026-01-01', [hit()]);

    const index = pruneToRetention(aged, '2026-09-21', 90);

    expect(index.oldestDay).toBe('2026-06-24');
  });

  it('forgets gap days that aged out', () => {
    const withGap = markGapDay(
      merge(emptyIndex(), '2026-09-10', [hit()]),
      '2026-01-05',
    );

    const index = pruneToRetention(withGap, '2026-09-21', 90);

    expect(index.gapDays).toStrictEqual([]);
  });
});

describe('daysToWalk', () => {
  it('walks the backfill window on a cold start', () => {
    const days = daysToWalk({ index: emptyIndex(), today: '2026-09-21' });

    expect(days).toHaveLength(MAX_BACKFILL_DAYS);
    expect(days[0]).toBe('2026-09-07');
    expect(days[days.length - 1]).toBe('2026-09-20');
  });

  it('resumes the day after the index ends', () => {
    const index = merge(emptyIndex(), '2026-09-18', [hit()]);

    const days = daysToWalk({ index, today: '2026-09-21' });

    expect(days).toStrictEqual(['2026-09-19', '2026-09-20']);
  });

  it('walks nothing when the index already reaches yesterday', () => {
    const index = merge(emptyIndex(), '2026-09-20', [hit()]);

    expect(daysToWalk({ index, today: '2026-09-21' })).toStrictEqual([]);
  });

  // The whole point of resuming from the index: one failed night is re-walked
  // rather than becoming a permanent hole.
  it('re-walks a day a previous build failed on', () => {
    const index = markGapDay(
      merge(emptyIndex(), '2026-09-20', [hit()]),
      '2026-09-15',
    );

    expect(daysToWalk({ index, today: '2026-09-21' })).toStrictEqual([
      '2026-09-15',
    ]);
  });

  it('never walks more than the backfill window after a long outage', () => {
    const index = merge(emptyIndex(), '2026-01-01', [hit()]);

    const days = daysToWalk({ index, today: '2026-09-21' });

    expect(days).toHaveLength(MAX_BACKFILL_DAYS);
    expect(days[0]).toBe('2026-09-07');
  });

  // A day whose runs have aged out of the API can never complete. Walking
  // gaps first would let it refill the budget every night and freeze the
  // window where it is.
  it('walks fresh days before re-walking gaps when the budget is tight', () => {
    const withGaps = ['2026-09-06', '2026-09-07', '2026-09-08'].reduce(
      markGapDay,
      merge(emptyIndex(), '2026-09-17', [hit()]),
    );

    const days = daysToWalk({
      index: withGaps,
      today: '2026-09-21',
      maxBackfill: 3,
    });

    expect(days).toStrictEqual(['2026-09-18', '2026-09-19', '2026-09-20']);
  });

  it('spends what the fresh days leave on repairing gaps', () => {
    const withGap = markGapDay(
      merge(emptyIndex(), '2026-09-19', [hit()]),
      '2026-09-18',
    );

    const days = daysToWalk({
      index: withGap,
      today: '2026-09-21',
      maxBackfill: 3,
    });

    expect(days).toStrictEqual(['2026-09-18', '2026-09-20']);
  });

  it('forgets gap days older than the backfill window', () => {
    const index = markGapDay(
      merge(emptyIndex(), '2026-09-20', [hit()]),
      '2026-01-05',
    );

    expect(daysToWalk({ index, today: '2026-09-21' })).toStrictEqual([]);
  });
});

describe('isUsableIndex', () => {
  it('accepts an index this code produced', () => {
    expect(isUsableIndex(merge(emptyIndex(), '2026-09-10', [hit()]))).toBe(
      true,
    );
  });

  it('rejects a version it cannot safely extend', () => {
    expect(isUsableIndex({ ...emptyIndex(), version: INDEX_VERSION + 1 })).toBe(
      false,
    );
  });

  it('rejects an entry with no day buckets to merge into', () => {
    expect(
      isUsableIndex({
        ...emptyIndex(),
        entries: { [FILE]: { path: FILE, sameShaFailThenPass: 3 } },
      }),
    ).toBe(false);
  });

  it('rejects values that are not an index at all', () => {
    expect(isUsableIndex(null)).toBe(false);
    expect(isUsableIndex('an index')).toBe(false);
    expect(isUsableIndex({})).toBe(false);
  });
});

describe('parseIndex', () => {
  it('round-trips an index through JSON', () => {
    const index = merge(emptyIndex(), '2026-09-10', [hit()]);

    expect(parseIndex(JSON.stringify(index))).toStrictEqual(index);
  });

  // A truncated upload must send the builder back to a backfill rather than
  // chain every later night onto a broken shape.
  it('returns null for a payload it cannot trust', () => {
    expect(parseIndex('{"version":1,"entries":')).toBeNull();
    expect(parseIndex('{"version":99}')).toBeNull();
  });
});

describe('indexCoverage', () => {
  it('reads a nightly index built last night as complete', () => {
    const index = merge(emptyIndex(), '2026-09-20', [hit()]);

    const coverage = indexCoverage(index, '2026-09-21');

    expect(coverage.staleDays).toBe(1);
    expect(coverage.complete).toBe(true);
  });

  it('reads a missed night as incomplete', () => {
    const index = merge(emptyIndex(), '2026-09-17', [hit()]);

    expect(indexCoverage(index, '2026-09-21').complete).toBe(false);
  });

  it('withholds completeness while a day is still a hole', () => {
    const index = markGapDay(
      merge(emptyIndex(), '2026-09-20', [hit()]),
      '2026-09-15',
    );

    const coverage = indexCoverage(index, '2026-09-21');

    expect(coverage.gapDays).toStrictEqual(['2026-09-15']);
    expect(coverage.complete).toBe(false);
  });

  it('reports the span the index claims to cover', () => {
    const first = merge(emptyIndex(), '2026-09-07', [hit()]);
    const index = merge(first, '2026-09-20', [hit()]);

    expect(indexCoverage(index, '2026-09-21').daysCovered).toBe(14);
  });

  it('treats an index that was never built as unusable', () => {
    const coverage = indexCoverage(emptyIndex(), '2026-09-21');

    expect(coverage.daysCovered).toBe(0);
    expect(coverage.complete).toBe(false);
  });

  // The coverage travels to Stage 3 through a JSON artifact, and JSON writes
  // Infinity as null — a value the reader on the far side cannot compare.
  it('reports unknown staleness as a number that survives JSON', () => {
    const coverage = indexCoverage(emptyIndex(), '2026-09-21');

    expect(coverage.staleDays).toBe(UNKNOWN_STALE_DAYS);
    expect(JSON.parse(JSON.stringify(coverage)).staleDays).toBe(
      UNKNOWN_STALE_DAYS,
    );
  });
});

describe('indexTotals', () => {
  it('sums the gaps each walked day disclosed', () => {
    const index = mergeDayHits({
      index: mergeDayHits({
        index: emptyIndex(),
        day: '2026-09-10',
        hits: [hit()],
        runsScanned: 300,
        missingLogBlobs: 2,
        infrastructureFailures: 1,
        unattributedReruns: [
          {
            jobName: 'Unit tests (3)',
            runId: 1,
            jobId: 2,
            reason: 'missing_log',
          },
        ],
      }),
      day: '2026-09-11',
      hits: [],
      runsScanned: 280,
      missingLogBlobs: 1,
      infrastructureFailures: 3,
      unattributedReruns: [],
    });

    expect(indexTotals(index)).toStrictEqual({
      runsScanned: 580,
      missingLogBlobs: 3,
      infrastructureFailures: 4,
      unattributedReruns: 1,
    });
  });

  // Otherwise the comment would eventually quote a year of lost runners as
  // belonging to a 90-day window.
  it('forgets what a day cost once it leaves the window', () => {
    const aged = mergeDayHits({
      index: emptyIndex(),
      day: '2026-01-01',
      hits: [],
      runsScanned: 300,
      missingLogBlobs: 5,
    });

    const index = pruneToRetention(aged, '2026-09-21', 90);

    expect(indexTotals(index)).toStrictEqual({
      runsScanned: 0,
      missingLogBlobs: 0,
      infrastructureFailures: 0,
      unattributedReruns: 0,
    });
  });

  it('is all zero for an index that was never built', () => {
    expect(indexTotals(emptyIndex()).runsScanned).toBe(0);
  });
});

describe('daysInRange', () => {
  it('includes both ends', () => {
    expect(daysInRange('2026-09-19', '2026-09-21')).toStrictEqual([
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
    ]);
  });

  it('crosses a month boundary', () => {
    expect(daysInRange('2026-08-31', '2026-09-01')).toStrictEqual([
      '2026-08-31',
      '2026-09-01',
    ]);
  });

  it('is empty when the range is inverted', () => {
    expect(daysInRange('2026-09-21', '2026-09-19')).toStrictEqual([]);
  });
});
