/**
 * Per-file combination of the workflow's two independent signals, and the
 * sticky-comment table that presents them.
 *
 * Stage 1 reports same-SHA unit-test fail-then-pass; Stage 2 reports J1-J10
 * patterns still present in the file. Neither suppresses the other.
 */

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
  | 'not_run';

export type UnreviewedDetails = {
  reason: UnreviewedReason;
  attempts?: number;
  cap?: number;
  logUrl?: string;
};

export type AnalyzerRunStatusHint =
  | 'reviewed'
  | 'did_not_complete'
  | 'skipped_cap';

export type AnalyzerRunHint = {
  file: string;
  status: AnalyzerRunStatusHint;
  attempts: number;
};

export type FlakyTableFile = {
  path: string;
  hasHistoryHit: boolean;
  patternsReviewed: boolean;
  sameShaFailThenPass: number;
  exampleRunUrl: string;
  findings: FlakyTableFinding[];
  unreviewed?: UnreviewedDetails;
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
  return `${light} ${input.count}${runLink}`;
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
  return 'not reviewed — analyzer did not run';
}

export function resolveUnreviewedReason({
  file,
  patternsReviewed,
  runs,
  aiStepOutcome,
  maxFiles,
  logUrl,
}: {
  file: string;
  patternsReviewed: boolean;
  runs: AnalyzerRunHint[] | undefined;
  aiStepOutcome: string;
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
  if (aiStepOutcome === 'skipped') {
    return { reason: 'skipped_fork' };
  }
  return { reason: 'not_run' };
}

export function renderFlakyPatternsCell(finding: FlakyTableFinding): string {
  const light = patternSeverityLight(finding.severity);
  const label = `${finding.patternId} — ${finding.patternName}`;
  const linked =
    finding.blobUrl.length > 0 ? `[${label}](${finding.blobUrl})` : label;
  return `${light} ${linked}`;
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
  });
  if (file.findings.length === 0) {
    const pattern = file.patternsReviewed
      ? 'none'
      : renderUnreviewedPatternsCell(
          file.unreviewed ?? { reason: 'not_run' },
        );
    return [tableRow(file.path, pastFlakyness, pattern)];
  }
  return file.findings.map((finding) =>
    tableRow(file.path, pastFlakyness, renderFlakyPatternsCell(finding)),
  );
}

export function renderFlakyFindingsTable(files: FlakyTableFile[]): string {
  const rows = files.flatMap(rowsForFile);
  if (rows.length === 0) {
    return '';
  }
  return `| File | Past flakyness | Flaky patterns |\n| --- | --- | --- |\n${rows.join('\n')}`;
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

export function assembleAllClearMarkdown({
  marker,
  stateBlock,
}: {
  marker: string;
  stateBlock: string;
}): string {
  return `${marker}
## Flaky unit test detection

${TRAFFIC_LIGHT.green} All clear
${stateBlock}`;
}
