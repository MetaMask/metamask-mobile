import type { PredictMarket } from '../types';
import { isCryptoUpDown } from './cryptoUpDown';

/**
 * Keeps only the first occurrence of each Crypto Up/Down series slug.
 * Non-Up/Down markets pass through unchanged.
 */
export function deduplicateSeriesMarkets(
  markets: PredictMarket[],
): PredictMarket[] {
  const seenSlugs = new Set<string>();

  return markets.filter((market) => {
    if (!isCryptoUpDown(market)) {
      return true;
    }

    const { slug } = market.series;
    if (seenSlugs.has(slug)) {
      return false;
    }

    seenSlugs.add(slug);
    return true;
  });
}
