import type { PredictOutcome } from '../types';

export const getSortedLineIndices = (outcomes: PredictOutcome[]): number[] =>
  outcomes
    .map((outcome, index) => (outcome.line != null ? index : -1))
    .filter((index) => index !== -1)
    .sort((a, b) => {
      const lineA = outcomes[a].line ?? 0;
      const lineB = outcomes[b].line ?? 0;
      return lineA - lineB;
    });

export const getDefaultSelectedLineIndex = (
  outcomes: PredictOutcome[],
  lineIndices: number[],
): number => {
  if (lineIndices.length === 0) {
    return 0;
  }

  return lineIndices.reduce((bestIdx, outcomeIdx, currentIdx) => {
    const bestVolume = outcomes[lineIndices[bestIdx]]?.volume ?? 0;
    const currentVolume = outcomes[outcomeIdx]?.volume ?? 0;

    return currentVolume > bestVolume ? currentIdx : bestIdx;
  }, 0);
};

export const getSafeSelectedLineIndex = (
  outcomes: PredictOutcome[],
  lineIndices: number[],
  selectedLineIndex?: number,
): number => {
  const defaultSelectedIndex = getDefaultSelectedLineIndex(
    outcomes,
    lineIndices,
  );
  const resolvedSelectedIndex = selectedLineIndex ?? defaultSelectedIndex;

  return lineIndices[resolvedSelectedIndex] !== undefined
    ? resolvedSelectedIndex
    : defaultSelectedIndex;
};

export const resolveSelectedLineOutcome = (
  outcomes: PredictOutcome[],
  selectedLineIndex?: number,
): PredictOutcome | undefined => {
  const lineIndices = getSortedLineIndices(outcomes);

  if (lineIndices.length === 0) {
    return outcomes[0];
  }

  const safeSelectedIndex = getSafeSelectedLineIndex(
    outcomes,
    lineIndices,
    selectedLineIndex,
  );

  return outcomes[lineIndices[safeSelectedIndex]] ?? outcomes[0];
};
