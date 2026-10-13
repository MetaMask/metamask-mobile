import {
  countCarriedAcrossMove,
  lookupFileHistory,
  parsePriorPaths,
  resolveHistoryForFiles,
} from './flaky-history-lookup';
import { emptyIndex, mergeDayHits } from './flaky-history-index';
import type { HistoryIndex } from './flaky-types';

const NEW_PATH = 'app/components/UI/Assets/watchlist/utils/batcher.test.ts';
const OLD_PATH = 'app/components/UI/Assets/utils/batcher.test.ts';
const OLDER_PATH = 'app/util/batcher.test.ts';

const indexWith = (
  entries: { path: string; day: string; count: number; runId?: number }[],
): HistoryIndex =>
  entries.reduce(
    (index, entry) =>
      mergeDayHits({
        index,
        day: entry.day,
        hits: Array.from({ length: entry.count }, () => ({
          path: entry.path,
          runId: entry.runId ?? 100,
          jobId: 200,
        })),
        runsScanned: 0,
      }),
    emptyIndex(),
  );

describe('parsePriorPaths', () => {
  // `git log --follow --name-only` repeats the current path on every commit.
  it('drops the current path and keeps the names it had before', () => {
    const output = [NEW_PATH, '', NEW_PATH, '', OLD_PATH, '', OLD_PATH].join(
      '\n',
    );

    expect(parsePriorPaths(output, NEW_PATH)).toStrictEqual([OLD_PATH]);
  });

  it('keeps a multi-step rename chain in the order git reported it', () => {
    const output = [NEW_PATH, OLD_PATH, OLDER_PATH].join('\n');

    expect(parsePriorPaths(output, NEW_PATH)).toStrictEqual([
      OLD_PATH,
      OLDER_PATH,
    ]);
  });

  it('is empty for a file that never moved', () => {
    expect(
      parsePriorPaths(`${NEW_PATH}\n\n${NEW_PATH}`, NEW_PATH),
    ).toStrictEqual([]);
    expect(parsePriorPaths('', NEW_PATH)).toStrictEqual([]);
  });

  it('caps a pathological rename chain', () => {
    const output = Array.from({ length: 20 }, (_, i) => `app/p${i}.test.ts`);

    expect(parsePriorPaths(output.join('\n'), NEW_PATH, 3)).toHaveLength(3);
  });
});

describe('lookupFileHistory', () => {
  it('reads the count recorded against the current path', () => {
    const index = indexWith([{ path: NEW_PATH, day: '2026-09-10', count: 2 }]);

    const history = lookupFileHistory(index, NEW_PATH, []);

    expect(history.sameShaFailThenPass).toBe(2);
    expect(history.historyPath).toBeUndefined();
  });

  // Without this a moved test reports "new", which is the same answer a
  // genuinely clean test gets.
  it('finds history recorded under the path the file had before the move', () => {
    const index = indexWith([{ path: OLD_PATH, day: '2026-09-10', count: 3 }]);

    const history = lookupFileHistory(index, NEW_PATH, [OLD_PATH]);

    expect(history.sameShaFailThenPass).toBe(3);
    expect(history.historyPath).toBe(OLD_PATH);
  });

  it('sums a file that flaked under both its old and new path', () => {
    const index = indexWith([
      { path: OLD_PATH, day: '2026-09-10', count: 3 },
      { path: NEW_PATH, day: '2026-09-18', count: 1 },
    ]);

    const history = lookupFileHistory(index, NEW_PATH, [OLD_PATH]);

    expect(history.sameShaFailThenPass).toBe(4);
  });

  // The file is where its history says it is, so there is nothing to explain.
  it('does not annotate a move when the current path has history of its own', () => {
    const index = indexWith([
      { path: OLD_PATH, day: '2026-09-10', count: 3 },
      { path: NEW_PATH, day: '2026-09-18', count: 1 },
    ]);

    expect(
      lookupFileHistory(index, NEW_PATH, [OLD_PATH]).historyPath,
    ).toBeUndefined();
  });

  it('sums across a multi-step rename chain', () => {
    const index = indexWith([
      { path: OLDER_PATH, day: '2026-09-08', count: 2 },
      { path: OLD_PATH, day: '2026-09-10', count: 3 },
    ]);

    const history = lookupFileHistory(index, NEW_PATH, [OLD_PATH, OLDER_PATH]);

    expect(history.sameShaFailThenPass).toBe(5);
    expect(history.historyPath).toBe(OLD_PATH);
  });

  it('links the newest hit across every name the file has had', () => {
    const index = indexWith([
      { path: OLD_PATH, day: '2026-09-10', count: 1, runId: 11 },
      { path: NEW_PATH, day: '2026-09-18', count: 1, runId: 99 },
    ]);

    expect(lookupFileHistory(index, NEW_PATH, [OLD_PATH]).exampleRunId).toBe(
      99,
    );
  });

  it('reports nothing for a file with no history under any name', () => {
    const index = indexWith([
      { path: OLDER_PATH, day: '2026-09-10', count: 1 },
    ]);

    expect(lookupFileHistory(index, NEW_PATH, [OLD_PATH])).toStrictEqual({
      sameShaFailThenPass: 0,
      exampleRunId: 0,
      exampleJobId: 0,
    });
  });
});

describe('resolveHistoryForFiles', () => {
  const jobLogUrlFor = (runId: number, jobId: number) =>
    `https://gh/run/${runId}/job/${jobId}`;
  const runHistoryUrl = 'https://gh/workflows/ci.yml';

  it('flags a file the index has seen fail then pass', () => {
    const files = resolveHistoryForFiles({
      index: indexWith([{ path: NEW_PATH, day: '2026-09-10', count: 2 }]),
      modifiedFiles: [NEW_PATH],
      priorPathsFor: () => [],
      jobLogUrlFor,
      runHistoryUrl,
    });

    expect(files[0].flaky).toBe(true);
    expect(files[0].exampleRunUrl).toBe('https://gh/run/100/job/200');
  });

  it('reports a file with no history as not flaky and without a link', () => {
    const files = resolveHistoryForFiles({
      index: emptyIndex(),
      modifiedFiles: [NEW_PATH],
      priorPathsFor: () => [],
      jobLogUrlFor,
      runHistoryUrl,
    });

    expect(files[0]).toStrictEqual({
      path: NEW_PATH,
      flaky: false,
      sameShaFailThenPass: 0,
      exampleRunUrl: '',
      runHistoryUrl,
    });
  });

  it('records which path supplied a moved file history', () => {
    const files = resolveHistoryForFiles({
      index: indexWith([{ path: OLD_PATH, day: '2026-09-10', count: 3 }]),
      modifiedFiles: [NEW_PATH],
      priorPathsFor: () => [OLD_PATH],
      jobLogUrlFor,
      runHistoryUrl,
    });

    expect(files[0].historyPath).toBe(OLD_PATH);
    expect(files[0].sameShaFailThenPass).toBe(3);
  });

  // The git walk costs a subprocess per file, and most files never moved.
  it('skips the rename lookup when the current path already has history', () => {
    const priorPathsFor = jest.fn(() => [OLD_PATH]);

    resolveHistoryForFiles({
      index: indexWith([{ path: NEW_PATH, day: '2026-09-10', count: 1 }]),
      modifiedFiles: [NEW_PATH],
      priorPathsFor,
      jobLogUrlFor,
      runHistoryUrl,
    });

    expect(priorPathsFor).not.toHaveBeenCalled();
  });

  it('keeps one row per modified file, in order', () => {
    const files = resolveHistoryForFiles({
      index: emptyIndex(),
      modifiedFiles: [NEW_PATH, OLD_PATH],
      priorPathsFor: () => [],
      jobLogUrlFor,
      runHistoryUrl,
    });

    expect(files.map((file) => file.path)).toStrictEqual([NEW_PATH, OLD_PATH]);
  });
});

describe('countCarriedAcrossMove', () => {
  it('counts only the files whose history came from another path', () => {
    const count = countCarriedAcrossMove([
      {
        path: NEW_PATH,
        flaky: true,
        sameShaFailThenPass: 1,
        exampleRunUrl: '',
        runHistoryUrl: '',
        historyPath: OLD_PATH,
      },
      {
        path: OLD_PATH,
        flaky: true,
        sameShaFailThenPass: 1,
        exampleRunUrl: '',
        runHistoryUrl: '',
      },
    ]);

    expect(count).toBe(1);
  });

  it('is zero when nothing moved', () => {
    expect(countCarriedAcrossMove([])).toBe(0);
  });
});
