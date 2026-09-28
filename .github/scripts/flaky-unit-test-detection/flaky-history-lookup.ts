/**
 * Reading the nightly history index on behalf of one pull request.
 *
 * The index is keyed by the path a test had when it failed, and moving files
 * is routine here, so a straight key lookup would report every moved test as
 * having no history — the same answer a genuinely clean test gets. That
 * silence is the failure mode worth avoiding: a test that flaked last week
 * does not stop being flaky because it changed directory.
 *
 * So a miss on the current path is followed by asking git where the file came
 * from and looking those paths up too, with the comment saying which path
 * supplied the count.
 */
import type { HistoryFile, HistoryIndex } from './flaky-types';

/** A pathological rename chain is not worth unbounded git work. */
const MAX_PRIOR_PATHS = 5;

/**
 * Prior names of a file, newest first, from `git log --follow` output.
 *
 * `--name-only --format=` prints one path per line for every commit that
 * touched the file, so the same path repeats and the current one dominates.
 */
export function parsePriorPaths(
  followOutput: string,
  currentPath: string,
  maxPaths = MAX_PRIOR_PATHS,
): string[] {
  const seen = new Set<string>();
  for (const line of followOutput.split('\n')) {
    const path = line.trim();
    if (path === '' || path === currentPath || seen.has(path)) {
      continue;
    }
    seen.add(path);
    if (seen.size >= maxPaths) {
      break;
    }
  }
  return [...seen];
}

export type FileHistory = {
  sameShaFailThenPass: number;
  exampleRunId: number;
  exampleJobId: number;
  /** The prior path that supplied the count, when the file has moved. */
  historyPath?: string;
};

/**
 * Sums the index across a file's current path and the paths it had before.
 *
 * A file that moved mid-window has history under both, and both describe the
 * same test, so both count. `historyPath` is only set when the current path
 * contributed nothing, which is the case worth explaining to a reader who
 * would otherwise see a count against a path with no matching runs.
 */
export function lookupFileHistory(
  index: HistoryIndex,
  currentPath: string,
  priorPaths: string[],
): FileHistory {
  const current = index.entries[currentPath];
  const prior = priorPaths
    .map((path) => index.entries[path])
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (!current && prior.length === 0) {
    return { sameShaFailThenPass: 0, exampleRunId: 0, exampleJobId: 0 };
  }

  const all = current ? [current, ...prior] : prior;
  const sameShaFailThenPass = all.reduce(
    (total, entry) => total + entry.sameShaFailThenPass,
    0,
  );
  // The newest hit across every name the file has had, so the example link
  // lands on the most recent evidence rather than on the oldest path.
  const newest = all.reduce((best, entry) =>
    entry.lastSeen > best.lastSeen ? entry : best,
  );
  const biggestPrior = prior.reduce<(typeof prior)[number] | undefined>(
    (best, entry) =>
      !best || entry.sameShaFailThenPass > best.sameShaFailThenPass
        ? entry
        : best,
    undefined,
  );

  return {
    sameShaFailThenPass,
    exampleRunId: newest.exampleRunId,
    exampleJobId: newest.exampleJobId,
    historyPath: current ? undefined : biggestPrior?.path,
  };
}

export type ResolveHistoryInput = {
  index: HistoryIndex;
  modifiedFiles: string[];
  /** Prior paths for a file, so the git call stays injectable for tests. */
  priorPathsFor: (path: string) => string[];
  jobLogUrlFor: (runId: number, jobId: number) => string;
  runHistoryUrl: string;
};

/**
 * The per-file history rows Stage 1 writes, in the same shape the old walk
 * produced, so Stage 3 does not need to know where the numbers came from.
 */
export function resolveHistoryForFiles({
  index,
  modifiedFiles,
  priorPathsFor,
  jobLogUrlFor,
  runHistoryUrl,
}: ResolveHistoryInput): HistoryFile[] {
  return modifiedFiles.map((path) => {
    // Only pay for the git walk when a direct hit has already failed.
    const priorPaths = index.entries[path] ? [] : priorPathsFor(path);
    const history = lookupFileHistory(index, path, priorPaths);
    return {
      path,
      flaky: history.sameShaFailThenPass > 0,
      sameShaFailThenPass: history.sameShaFailThenPass,
      exampleRunUrl:
        history.exampleRunId > 0
          ? jobLogUrlFor(history.exampleRunId, history.exampleJobId)
          : '',
      runHistoryUrl,
      ...(history.historyPath ? { historyPath: history.historyPath } : {}),
    };
  });
}

/** Files whose only history came from a path they no longer have. */
export function countCarriedAcrossMove(files: HistoryFile[]): number {
  return files.filter((file) => file.historyPath !== undefined).length;
}
