import type { PredictMarket } from '../../../../types';

/**
 * Pins markets whose `series.id` appears in `priorityOrder` to the front of
 * the Live Now carousel. Earlier IDs win. Markets without a matching series
 * keep their relative order after the pinned cards. Unknown IDs are ignored.
 */
export const applySeriesPriorityOrder = (
  markets: PredictMarket[],
  priorityOrder: readonly string[],
): PredictMarket[] => {
  if (priorityOrder.length === 0 || markets.length === 0) {
    return markets;
  }

  const prioritySeriesIds = new Set(priorityOrder);
  const prioritizedBySeries = new Map<string, PredictMarket[]>();
  const rest: PredictMarket[] = [];

  for (const market of markets) {
    const seriesId = market.series?.id;
    if (seriesId && prioritySeriesIds.has(seriesId)) {
      const bucket = prioritizedBySeries.get(seriesId) ?? [];
      bucket.push(market);
      prioritizedBySeries.set(seriesId, bucket);
      continue;
    }

    rest.push(market);
  }

  if (prioritizedBySeries.size === 0) {
    return markets;
  }

  const prioritized: PredictMarket[] = [];
  for (const seriesId of priorityOrder) {
    const bucket = prioritizedBySeries.get(seriesId);
    if (!bucket) {
      continue;
    }
    prioritized.push(...bucket);
    prioritizedBySeries.delete(seriesId);
  }

  return [...prioritized, ...rest];
};
