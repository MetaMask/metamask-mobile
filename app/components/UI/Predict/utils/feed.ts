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
 *
 * When `seriesOrder` is provided (e.g. a filter's declared `params.series`),
 * collapsed cards whose `series.id` appears in `seriesOrder` are ordered to
 * match that declaration within the slots they occupy, while all other
 * markets keep their relative API order.
 */
export function deduplicateSeriesMarkets(
  markets: PredictMarket[],
  seriesOrder?: readonly string[],
): PredictMarket[] {
  const seenSlugs = new Set<string>();

  const deduplicated = markets.filter((market) => {
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

  if (!seriesOrder?.length) {
    return deduplicated;
  }

  const orderIndexBySeriesId = new Map<string, number>();
  seriesOrder.forEach((seriesId, index) => {
    if (!orderIndexBySeriesId.has(seriesId)) {
      orderIndexBySeriesId.set(seriesId, index);
    }
  });

  const orderedSlotIndices: number[] = [];
  const orderedMarkets: PredictMarket[] = [];

  deduplicated.forEach((market, index) => {
    const seriesId = market.series?.id;
    if (seriesId && orderIndexBySeriesId.has(seriesId)) {
      orderedSlotIndices.push(index);
      orderedMarkets.push(market);
    }
  });

  if (orderedMarkets.length <= 1) {
    return deduplicated;
  }

  orderedMarkets.sort(
    (a, b) =>
      (orderIndexBySeriesId.get(a.series?.id ?? '') ?? 0) -
      (orderIndexBySeriesId.get(b.series?.id ?? '') ?? 0),
  );

  const result = [...deduplicated];
  orderedSlotIndices.forEach((slotIndex, orderedIndex) => {
    result[slotIndex] = orderedMarkets[orderedIndex];
  });

  return result;
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
