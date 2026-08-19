import type { PredictMarket } from '../types';
import { isCryptoUpDown } from './cryptoUpDown';
import { translateIfPresent } from './translations';

export function isStandaloneMarket(market: PredictMarket): boolean {
  const { parentMarketId } = market;
  return (
    parentMarketId === undefined ||
    parentMarketId === null ||
    String(parentMarketId).trim() === ''
  );
}

export function filterStandaloneMarkets(
  markets: PredictMarket[],
): PredictMarket[] {
  return markets.filter(isStandaloneMarket);
}

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

export const humanizePredictFilterId = (id: string): string =>
  id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const resolvePredictFilterLabel = ({
  id,
  titleKey,
  label,
}: {
  id: string;
  titleKey?: string;
  label?: string;
}): string => {
  if (titleKey) {
    const translatedLabel = translateIfPresent(titleKey);
    if (translatedLabel) {
      return translatedLabel;
    }
  }

  const trimmedLabel = label?.trim();
  return trimmedLabel || humanizePredictFilterId(id);
};
