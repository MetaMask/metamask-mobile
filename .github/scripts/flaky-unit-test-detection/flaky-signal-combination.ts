/**
 * Per-file combination of the workflow's two independent signals, and the
 * sticky-comment table that presents them.
 *
 * Stage 1 reports same-SHA unit-test fail-then-pass; Stage 2 reports J1-J10
 * patterns still present in the file. Neither suppresses the other.
 */
import type { AnalyzerRunRecord } from './flaky-types';

export type SignalCombination =
  | 'history_only'
  | 'history_unreviewed'
  | 'pattern_only'
  | 'history_and_pattern';

export type FileSignals = {
  path: string;
  hasHistoryHit: boolean;
  hasPatternFinding: boolean;
  // False when Stage 2 never reviewed this file's current content (fork PR,
  // analyzer failure, conservative fallback). "No pattern found" would be an
  // overclaim then, so history_unreviewed is reported instead of history_only.
  patternsReviewed: boolean;
};

export type FileSignalCombination = {
  path: string;
  combination: SignalCombination;
};

export const TRAFFIC_LIGHT = {
  red: ':red_circle:',
  yellow: ':yellow_circle:',
  green: ':green_circle:',
} as const;

export type PastFlakynessCellInput = {
  hasHistoryHit: boolean;
  hasPatternFinding: boolean;
  count: number;
  exampleRunUrl: string;
  /** The path that supplied the count, when the file has since been moved. */
  historyPath?: string;
};

export type FlakyTableFinding = {
  patternId: string;
  patternName: string;
  severity: string;
  blobUrl: string;
};

export type UnreviewedReason =
  | 'did_not_complete'
  | 'skipped_cap'
  | 'skipped_fork'
  | 'stage_failed'
  | 'not_run';

/** Why the workflow skipped Stage 2, as reported by Stage 1's outputs. */
export type AiSkipReason = 'fork' | 'no_files' | '';

export type UnreviewedDetails = {
  reason: UnreviewedReason;
  attempts?: number;
  cap?: number;
  logUrl?: string;
};

/** Only what the table needs from Stage 2's per-file run records. */
export type AnalyzerRunHint = Pick<
  AnalyzerRunRecord,
  'file' | 'status' | 'attempts'
>;

export type FlakyTableFile = {
  path: string;
  hasHistoryHit: boolean;
  patternsReviewed: boolean;
  sameShaFailThenPass: number;
  exampleRunUrl: string;
  /** The path that supplied the count, when the file has since been moved. */
  historyPath?: string;
  findings: FlakyTableFinding[];
  unreviewed?: UnreviewedDetails;
  /**
   * Commit the findings were reviewed at, when Stage 2 skipped the file this
   * run. Keeps a real warning on screen while saying it predates this push.
   */
  reviewedAtSha?: string;
};

export function combineFileSignals(
  signals: FileSignals,
): SignalCombination | null {
  if (signals.hasPatternFinding) {
    return signals.hasHistoryHit ? 'history_and_pattern' : 'pattern_only';
  }
  if (signals.hasHistoryHit) {
    return signals.patternsReviewed ? 'history_only' : 'history_unreviewed';
  }
  return null;
}

/** Files with neither signal are dropped — they have nothing to report. */
export function combineSignalsByFile(
  files: FileSignals[],
): FileSignalCombination[] {
  const combined: FileSignalCombination[] = [];
  for (const file of files) {
    const combination = combineFileSignals(file);
    if (combination) {
      combined.push({ path: file.path, combination });
    }
  }
  return combined;
}

export function renderPastFlakynessCell(input: PastFlakynessCellInput): string {
  if (!input.hasHistoryHit) {
    return 'new';
  }
  const light = input.hasPatternFinding
    ? TRAFFIC_LIGHT.red
    : TRAFFIC_LIGHT.yellow;
  const runLink =
    input.exampleRunUrl.length > 0 ? ` ([run](${input.exampleRunUrl}))` : '';
  // Without this the count reads as belonging to a path that has no runs
  // behind it, which looks like a bug rather than a move.
  const movedFrom = input.historyPath ? ` (as \`${input.historyPath}\`)` : '';
  return `${light} ${input.count}${movedFrom}${runLink}`;
}

export function patternSeverityLight(severity: string): string {
  if (severity === 'high' || severity === 'critical') {
    return TRAFFIC_LIGHT.red;
  }
  return TRAFFIC_LIGHT.yellow;
}

export function renderUnreviewedPatternsCell(
  details: UnreviewedDetails,
): string {
  if (details.reason === 'did_not_complete') {
    const attempts = details.attempts ?? 0;
    const attemptLabel = attempts === 1 ? 'attempt' : 'attempts';
    const log =
      details.logUrl && details.logUrl.length > 0
        ? ` ([log](${details.logUrl}))`
        : '';
    return `not reviewed — analysis did not complete after ${attempts} ${attemptLabel}${log}`;
  }
  if (details.reason === 'skipped_cap') {
    const cap = details.cap ?? 0;
    return `not reviewed — over the ${cap}-file cap`;
  }
  if (details.reason === 'skipped_fork') {
    return 'not reviewed — AI stage skipped on fork PRs';
  }
  if (details.reason === 'stage_failed') {
    const log =
      details.logUrl && details.logUrl.length > 0
        ? ` ([log](${details.logUrl}))`
        : '';
    return `not reviewed — the AI stage failed${log}`;
  }
  return 'not reviewed — analyzer did not run';
}

export function resolveUnreviewedReason({
  file,
  patternsReviewed,
  runs,
  aiStepOutcome,
  aiSkipReason = '',
  maxFiles,
  logUrl,
}: {
  file: string;
  patternsReviewed: boolean;
  runs: AnalyzerRunHint[] | undefined;
  aiStepOutcome: string;
  aiSkipReason?: AiSkipReason;
  maxFiles?: number;
  logUrl?: string;
}): UnreviewedDetails | undefined {
  if (patternsReviewed) {
    return undefined;
  }
  const run = runs?.find((entry) => entry.file === file);
  if (run?.status === 'did_not_complete') {
    return {
      reason: 'did_not_complete',
      attempts: run.attempts,
      logUrl,
    };
  }
  if (run?.status === 'skipped_cap') {
    return {
      reason: 'skipped_cap',
      cap: maxFiles,
    };
  }
  // A skipped step is only a fork when the workflow says so. It is also how a
  // run with nothing to analyze looks, and "skipped on fork PRs" would be a
  // wrong explanation on a branch PR.
  if (aiStepOutcome === 'skipped' && aiSkipReason === 'fork') {
    return { reason: 'skipped_fork' };
  }
  if (aiStepOutcome === 'failure') {
    return { reason: 'stage_failed', logUrl };
  }
  return { reason: 'not_run' };
}

export function renderFlakyPatternsCell(
  finding: FlakyTableFinding,
  reviewedAtSha?: string,
): string {
  const light = patternSeverityLight(finding.severity);
  const label = `${finding.patternId} — ${finding.patternName}`;
  const linked =
    finding.blobUrl.length > 0 ? `[${label}](${finding.blobUrl})` : label;
  const stale =
    reviewedAtSha && reviewedAtSha.length > 0
      ? ` _(reviewed at ${reviewedAtSha.slice(0, 7)})_`
      : '';
  return `${light} ${linked}${stale}`;
}

function tableRow(
  path: string,
  pastFlakyness: string,
  pattern: string,
): string {
  return `| \`${path}\` | ${pastFlakyness} | ${pattern} |`;
}

function rowsForFile(file: FlakyTableFile): string[] {
  const hasSignal = file.hasHistoryHit || file.findings.length > 0;
  if (!hasSignal) {
    return [];
  }
  const pastFlakyness = renderPastFlakynessCell({
    hasHistoryHit: file.hasHistoryHit,
    hasPatternFinding: file.findings.length > 0,
    count: file.sameShaFailThenPass,
    exampleRunUrl: file.exampleRunUrl,
    historyPath: file.historyPath,
  });
  if (file.findings.length === 0) {
    const pattern = file.patternsReviewed
      ? 'none'
      : renderUnreviewedPatternsCell(file.unreviewed ?? { reason: 'not_run' });
    return [tableRow(file.path, pastFlakyness, pattern)];
  }
  return file.findings.map((finding) =>
    tableRow(
      file.path,
      pastFlakyness,
      renderFlakyPatternsCell(finding, file.reviewedAtSha),
    ),
  );
}

export const FLAKY_TABLE_HEADER =
  '| File | Past flakyness | Flaky patterns |\n| --- | --- | --- |';

export function renderFlakyFindingsTable(files: FlakyTableFile[]): string {
  const rows = files.flatMap(rowsForFile);
  if (rows.length === 0) {
    return '';
  }
  return `${FLAKY_TABLE_HEADER}\n${rows.join('\n')}`;
}

/**
 * Body for a comment that must stay up (history coverage incomplete) while
 * neither signal fired, so the reader sees a sentence instead of an empty
 * table followed by a footer that points at it.
 */
export function renderNoFindingsLine(
  modifiedFileCount: number,
  historyAvailable = true,
): string {
  const files =
    modifiedFileCount === 1
      ? 'the modified unit test file'
      : `the ${modifiedFileCount} modified unit test files`;
  // Claiming no history was found reads as a clean result, which is the one
  // thing an unread index cannot support. Only the pattern signal ran.
  if (!historyAvailable) {
    return `No flaky pattern found for ${files}. Past flakiness could not be checked.`;
  }
  return `No same-SHA fail-then-pass history and no flaky pattern found for ${files} in the inspected range.`;
}

export function assembleFlakyCommentMarkdown({
  marker,
  table,
  diffs,
  coverageLine,
  skillLink,
  stateBlock,
}: {
  marker: string;
  table: string;
  diffs: string;
  coverageLine: string;
  skillLink: string;
  stateBlock: string;
}): string {
  const coverage = coverageLine.trim();
  const parts = [marker, '## Flaky unit test detection', '', table];
  if (diffs.length > 0) {
    parts.push('', diffs);
  }
  if (coverage.length > 0) {
    parts.push('', coverage);
  }
  parts.push(
    '',
    `See the [flaky-test-detection skill](${skillLink}).`,
    stateBlock,
  );
  return `${parts.join('\n')}\n`;
}

/** GitHub rejects an issue comment body past 65536 characters. */
export const COMMENT_BODY_BUDGET = 60000;

export type FitCommentBodyInput = {
  marker: string;
  table: string;
  diffs: string;
  coverageLine: string;
  skillLink: string;
  stateBlock: string;
  runUrl: string;
  budget?: number;
};

function rowsOf(table: string): { header: string; rows: string[] } {
  const lines = table.split('\n');
  return { header: lines.slice(0, 2).join('\n'), rows: lines.slice(2) };
}

/**
 * Builds the comment so it always fits, dropping the least load-bearing parts
 * first. The state block is reserved before anything else: losing it makes the
 * next run re-analyze every file and re-post findings the reader already saw,
 * which is worse than losing a suggested fix.
 */
export function fitCommentBody(input: FitCommentBodyInput): string {
  const budget = input.budget ?? COMMENT_BODY_BUDGET;
  const full = assembleFlakyCommentMarkdown(input);
  if (full.length <= budget) {
    return full;
  }

  const seeRun =
    input.runUrl.length > 0
      ? `[the Summary tab](${input.runUrl})`
      : 'the Summary tab';

  const withoutDiffs = assembleFlakyCommentMarkdown({
    ...input,
    diffs: '',
    coverageLine: [
      input.coverageLine,
      `_Suggested fixes omitted to fit the comment size limit; see ${seeRun}._`,
    ]
      .filter((line) => line.trim().length > 0)
      .join('\n\n'),
  });
  if (withoutDiffs.length <= budget) {
    return withoutDiffs;
  }

  const { header, rows } = rowsOf(input.table);
  for (let keep = rows.length - 1; keep >= 1; keep -= 1) {
    const truncated = assembleFlakyCommentMarkdown({
      ...input,
      diffs: '',
      table: `${header}\n${rows.slice(0, keep).join('\n')}`,
      coverageLine: [
        input.coverageLine,
        `_${rows.length - keep} more row(s) and the suggested fixes were omitted to fit the comment size limit; see ${seeRun}._`,
      ]
        .filter((line) => line.trim().length > 0)
        .join('\n\n'),
    });
    if (truncated.length <= budget) {
      return truncated;
    }
  }

  // Every row is gone and it still does not fit, so only the state block and
  // a pointer at the run are left to keep.
  return assembleFlakyCommentMarkdown({
    ...input,
    diffs: '',
    table: `All findings were omitted to fit the comment size limit; see ${seeRun}.`,
    coverageLine: '',
  });
}

export function assembleAllClearMarkdown({
  marker,
  stateBlock,
  note = '',
}: {
  marker: string;
  stateBlock: string;
  note?: string;
}): string {
  const disclosure = note.trim().length > 0 ? `\n\n${note.trim()}` : '';
  return `${marker}
## Flaky unit test detection

${TRAFFIC_LIGHT.green} All clear${disclosure}
${stateBlock}`;
}
