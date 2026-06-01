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
