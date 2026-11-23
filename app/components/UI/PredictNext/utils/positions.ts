import type { PredictPosition } from '../types';

/** A Position's identity within its Venue: Market plus held side. */
export const positionKey = ({ marketId, side }: PredictPosition): string =>
  `${marketId}-${side}`;

/**
 * Flattens loaded Positions pages, keeping only the latest copy of each
 * Position. A Position can repeat within one pass after its status advances,
 * which moves it to a later status group; the later copy is the current one.
 */
export const dedupeLatestPositions = (
  pages: readonly { positions: readonly PredictPosition[] }[],
): PredictPosition[] => {
  const positions = pages.flatMap((page) => page.positions);
  const lastIndex = new Map<string, number>();
  positions.forEach((position, index) =>
    lastIndex.set(positionKey(position), index),
  );
  return positions.filter(
    (position, index) => lastIndex.get(positionKey(position)) === index,
  );
};
