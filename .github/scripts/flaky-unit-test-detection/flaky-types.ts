/**
 * Shapes the three stages exchange through the JSON artifacts and the sticky
 * comment state block.
 *
 * Stage 1 writes `HistoryArtifact`, Stage 2 writes `MergedAiAnalysis`
 * (flaky-ai-analysis.ts) and Stage 3 reads both plus the `CommentState` it
 * embedded in the previous comment. Every stage runs in its own process, so a
 * drifting private copy of any of these would only surface at runtime.
 */

/** One J1-J10 pattern occurrence, as emitted by Stage 2 and rendered by Stage 3. */
export type Finding = {
  file: string;
  line?: number;
  patternId: string;
  patternName: string;
  severity: string;
  snippet?: string;
  explanation: string;
  suggestedFix: string;
  historicalHintUsed: boolean;
};

/** The subset of a finding the sticky comment renders and re-validates. */
export type StoredFinding = Pick<
  Finding,
  | 'file'
  | 'line'
  | 'patternId'
  | 'patternName'
  | 'severity'
  | 'snippet'
  | 'suggestedFix'
>;

export type PerFileState = {
  analyzedSha: string;
  findings: StoredFinding[];
  /**
   * Whether Stage 2 reviewed the file at `analyzedSha`. Absent in comments
   * written before this field existed, which reads as "not reviewed" until the
   * file is analyzed again — the safe direction for the Flaky patterns cell.
   */
  patternsReviewed?: boolean;
};

export type CommentState = {
  version: number;
  windows: number[];
  files: Record<string, PerFileState>;
};

export type HistoryFile = {
  path: string;
  flaky: boolean;
  sameShaFailThenPass: number;
  exampleRunUrl: string;
  runHistoryUrl: string;
  /**
   * The path that supplied the count, when the file has since been moved.
   * Absent while the file still sits where its history was recorded.
   */
  historyPath?: string;
};

/** A confirmed fail-then-pass whose failing test file could not be identified. */
export type UnattributedRerun = {
  jobName: string;
  runId: number;
  jobId: number;
  reason: 'missing_log' | 'unread';
};

/** What the nightly index covers, and how much to trust it. */
export type CoverageWindow = {
  /** Whole days between the newest day walked and now. */
  staleDays: number;
  daysCovered: number;
  /** Days inside the window that were never fully walked. */
  gapDays: string[];
  oldestDay: string;
  newestDay: string;
  /** Fresh enough, and with no holes, to support an all-clear. */
  complete: boolean;
};

/**
 * Written by Stage 1, read by Stage 2 and Stage 3. Stage 3 reads it as
 * `Partial` because a Stage 1 that failed mid-way still writes what it has.
 */
export type HistoryArtifact = {
  generatedAt: string;
  workflow: string;
  job: string;
  coverage: CoverageWindow;
  /** ci.yml runs the index was built from, across its whole window. */
  indexRunsScanned: number;
  historyComplete: boolean;
  missingLogBlobs: number;
  /** Jobs whose runner died before finishing; no test signal either way. */
  infrastructureFailures: number;
  /** A sample of unattributable re-runs, for the comment's disclosure line. */
  unattributedReruns: UnattributedRerun[];
  unattributedRerunCount: number;
  /** Files whose history was found only under a path they no longer have. */
  carriedAcrossMove: number;
  analyzedFiles: string[];
  headSha: string;
  files: HistoryFile[];
};

/** One day's confirmed fail-then-pass count for a single test path. */
export type IndexDayCount = {
  /** YYYY-MM-DD, the day the failing run started. */
  date: string;
  count: number;
};

/**
 * Per-day counts rather than a running total: pruning the window then becomes
 * dropping the days that fell out and re-summing, instead of decaying a number
 * nobody can reconstruct.
 */
export type HistoryIndexEntry = {
  path: string;
  /** Always the sum of `days`; recomputed on every merge and prune. */
  sameShaFailThenPass: number;
  days: IndexDayCount[];
  /** Newest hit, so the comment can link one concrete job log. */
  exampleRunId: number;
  exampleJobId: number;
  lastSeen: string;
};

/**
 * What one walked day cost and could not see.
 *
 * Bucketed per day for the same reason the hit counts are: these are quoted in
 * the comment as totals "in this window", so they have to shrink when a day
 * leaves the window and must not double when a day is re-walked.
 */
export type IndexDayStats = {
  date: string;
  runsScanned: number;
  missingLogBlobs: number;
  infrastructureFailures: number;
  unattributedReruns: number;
};

/**
 * Built nightly on main and published as an artifact, then read by Stage 1 on
 * every PR. Each build merges into the one before it, so `version` exists to
 * reject a shape this code cannot safely extend rather than chain from it.
 */
export type HistoryIndex = {
  version: number;
  builtAt: string;
  /** Inclusive bounds of the window the index claims to cover. */
  oldestDay: string;
  newestDay: string;
  /** Days inside the window no build ever completed. */
  gapDays: string[];
  days: IndexDayStats[];
  entries: Record<string, HistoryIndexEntry>;
  /** A capped sample for the comment's disclosure line, newest first. */
  unattributedReruns: UnattributedRerun[];
};

/** Window-wide sums over `HistoryIndex.days`. */
export type IndexTotals = {
  runsScanned: number;
  missingLogBlobs: number;
  infrastructureFailures: number;
  unattributedReruns: number;
};

export type AnalyzerRunStatus = 'reviewed' | 'did_not_complete' | 'skipped_cap';

export type AnalyzerRunRecord = {
  file: string;
  status: AnalyzerRunStatus;
  attempts: number;
  durationMs: number;
};
