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
};

/** A confirmed fail-then-pass whose failing test file could not be identified. */
export type UnattributedRerun = {
  jobName: string;
  runId: number;
  jobId: number;
  reason: 'missing_log' | 'unread';
};

/** The range Stage 1 actually covered, as opposed to the one it asked for. */
export type CoverageWindow = {
  lookbackDays: number;
  runsListed: number;
  oldestRunSampled: string;
  newestRunSampled: string;
  cappedDays: string[];
};

/**
 * Written by Stage 1, read by Stage 2 and Stage 3. Stage 3 reads it as
 * `Partial` because a Stage 1 that failed mid-way still writes what it has.
 */
export type HistoryArtifact = {
  generatedAt: string;
  workflow: string;
  job: string;
  lookbackDays: number;
  coverageWindow: CoverageWindow;
  sampledRunCount: number;
  candidateShaCount: number;
  candidatesInspected: number;
  historyComplete: boolean;
  graphqlQueries: number;
  unreadFailedRuns: number;
  missingLogBlobs: number;
  /** Jobs whose runner died before finishing; no test signal either way. */
  infrastructureFailures: number;
  /** A sample of unattributable re-runs, for the comment's disclosure line. */
  unattributedReruns: UnattributedRerun[];
  unattributedRerunCount: number;
  analyzedFiles: string[];
  headSha: string;
  files: HistoryFile[];
};

export type AnalyzerRunStatus = 'reviewed' | 'did_not_complete' | 'skipped_cap';

export type AnalyzerRunRecord = {
  file: string;
  status: AnalyzerRunStatus;
  attempts: number;
  durationMs: number;
};
