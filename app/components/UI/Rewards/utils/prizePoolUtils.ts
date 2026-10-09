export interface PrizePoolProgressResult {
  progress: number;
  currentPrize: number;
  nextPrize: number | null;
  nextThreshold: number;
  isMaxTier: boolean;
}

/**
 * Computes progress toward the next prize tier from sorted milestones (ascending threshold).
 */
export function computePrizePoolProgress<T extends { prize: number }>(
  milestones: readonly T[],
  totalAmount: number,
  getThreshold: (m: T) => number,
): PrizePoolProgressResult {
  let currentIndex = 0;
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (totalAmount >= getThreshold(milestones[i])) {
      currentIndex = i;
      break;
    }
  }

  const current = milestones[currentIndex];
  const next = milestones[currentIndex + 1];

  if (!next) {
    return {
      progress: 1,
      currentPrize: current.prize,
      nextPrize: null,
      nextThreshold: getThreshold(current),
      isMaxTier: true,
    };
  }

  const rangeAmount = getThreshold(next) - getThreshold(current);
  const progressInRange = totalAmount - getThreshold(current);
  const progress = Math.min(progressInRange / rangeAmount, 1);

  return {
    progress,
    currentPrize: current.prize,
    nextPrize: next.prize,
    nextThreshold: getThreshold(next),
    isMaxTier: false,
  };
}

/**
 * Whether a prize pool section has anything to say — data to show, a load in
 * progress, or an error to report.
 *
 * Parent views use this to drop their section heading in step with the prize
 * pool itself: a lone "Prize pool" title above an empty space is worse than no
 * section at all. It lives here rather than on the component so a view can ask
 * without importing (and having to mock) the component itself.
 *
 * @param params - Whether data is present, plus the loading and error flags.
 * @param params.hasData - Whether prize pool data has been resolved.
 * @param params.isLoading - Whether a fetch is in flight.
 * @param params.hasError - Whether the last fetch failed.
 * @returns Whether the prize pool section will render anything.
 */
export function hasPrizePoolContent({
  hasData,
  isLoading,
  hasError,
}: {
  hasData: boolean;
  isLoading: boolean;
  hasError: boolean;
}): boolean {
  return hasData || isLoading || hasError;
}
