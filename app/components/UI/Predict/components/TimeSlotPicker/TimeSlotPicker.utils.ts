import { PredictMarket } from '../../types';

/**
 * Formats an ISO date string to a locale-aware "H:MM AM/PM" time string.
 * Returns an empty string for invalid dates.
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/**
 * Returns the market with the smallest positive time remaining (i.e. the
 * market that is currently "live" — soonest to end but not yet ended).
 * Returns `undefined` when no market has a future endDate.
 */
export const findLiveMarket = (
  markets: PredictMarket[],
): PredictMarket | undefined => {
  const now = Date.now();
  let closest: PredictMarket | undefined;
  let closestDiff = Infinity;

  for (const market of markets) {
    if (!market.endDate) continue;
    const diff = new Date(market.endDate).getTime() - now;
    if (diff > 0 && diff < closestDiff) {
      closestDiff = diff;
      closest = market;
    }
  }
  return closest;
};

/**
 * Returns the market whose endDate is closest to now (past or future).
 * Falls back to the first market in the array when none have an endDate.
 */
export const findNearestMarket = (
  markets: PredictMarket[],
): PredictMarket | undefined => {
  if (markets.length === 0) return undefined;
  const now = Date.now();
  let nearest: PredictMarket | undefined;
  let nearestDiff = Infinity;

  for (const market of markets) {
    if (!market.endDate) continue;
    const diff = Math.abs(new Date(market.endDate).getTime() - now);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = market;
    }
  }
  return nearest ?? markets[0];
};
