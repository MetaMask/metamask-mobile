/**
 * Per-file combination of the workflow's two independent signals.
 *
 * Stage 1 reports same-SHA unit-test fail-then-pass; Stage 2 reports J1-J10
 * patterns still present in the file. Neither suppresses the other, and the
 * pair says more than either alone: history without a pattern suggests the
 * flake was already fixed (or was environmental), both together mean it is
 * unfixed, and a pattern without history points at this PR.
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

const COMBINATION_LABELS: Record<SignalCombination, string> = {
  history_and_pattern:
    'Failed then passed on an identical commit **and** still contains a flaky pattern — unfixed. Start with the suggested fix below.',
  history_only:
    'Failed then passed on an identical commit, but no flaky pattern was found in the current file — check whether the cause was already fixed, or is environmental (runner load, shard timing).',
  history_unreviewed:
    'Failed then passed on an identical commit. Pattern analysis did not review this version of the file, so there is no verdict on the cause — audit it manually.',
  pattern_only:
    'Flaky pattern found in this PR, with no same-SHA fail-then-pass in the sampled window — most likely introduced here.',
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

export function signalCombinationLabel(combination: SignalCombination): string {
  return COMBINATION_LABELS[combination];
}

/**
 * Renders the per-file verdict that opens the sticky comment, so a reviewer
 * reads which of the three situations applies before the table and the
 * pattern details below it.
 */
export function renderSignalsSection(files: FileSignals[]): string {
  const combined = combineSignalsByFile(files);
  if (combined.length === 0) return '';

  const lines = combined
    .map(
      ({ path, combination }) =>
        `- \`${path}\` — ${signalCombinationLabel(combination)}`,
    )
    .join('\n');
  return `### Signals\n\n${lines}\n`;
}
