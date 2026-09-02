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

export interface SeriesPrioritySlot {
  seriesId: string;
  index: number;
}

/**
 * Places matching `series.id` cards at the given 0-based indexes, then applies
 * {@link applySeriesPriorityOrder} to the remaining cards. Slots win for the
 * same series. First slot wins for a duplicate series or index. Unknown IDs
 * are ignored (no hole). Indexes past the rail length append.
 */
export const applySeriesPriority = (
  markets: PredictMarket[],
  priorityOrder: readonly string[],
  prioritySlots: readonly SeriesPrioritySlot[] = [],
): PredictMarket[] => {
  if (markets.length === 0 || prioritySlots.length === 0) {
    return applySeriesPriorityOrder(markets, priorityOrder);
  }

  const claimedIndexes = new Set<number>();
  const claimedSeries = new Set<string>();
  const resolvedSlots: SeriesPrioritySlot[] = [];

  for (const slot of prioritySlots) {
    const seriesId = slot.seriesId.trim();
    if (
      !seriesId ||
      !Number.isInteger(slot.index) ||
      slot.index < 0 ||
      claimedSeries.has(seriesId) ||
      claimedIndexes.has(slot.index)
    ) {
      continue;
    }

    claimedSeries.add(seriesId);
    claimedIndexes.add(slot.index);
    resolvedSlots.push({ seriesId, index: slot.index });
  }

  if (resolvedSlots.length === 0) {
    return applySeriesPriorityOrder(markets, priorityOrder);
  }

  const slottedSeriesIds = new Set(resolvedSlots.map((slot) => slot.seriesId));
  const slottedMarkets = new Map<string, PredictMarket[]>();
  const remaining: PredictMarket[] = [];

  for (const market of markets) {
    const seriesId = market.series?.id;
    if (seriesId && slottedSeriesIds.has(seriesId)) {
      const bucket = slottedMarkets.get(seriesId) ?? [];
      bucket.push(market);
      slottedMarkets.set(seriesId, bucket);
      continue;
    }

    remaining.push(market);
  }

  const result = [...applySeriesPriorityOrder(remaining, priorityOrder)];
  const placedSlots = resolvedSlots
    .filter((slot) => slottedMarkets.has(slot.seriesId))
    .sort((left, right) => left.index - right.index);

  for (const slot of placedSlots) {
    const bucket = slottedMarkets.get(slot.seriesId);
    if (!bucket) {
      continue;
    }

    result.splice(Math.min(slot.index, result.length), 0, ...bucket);
  }

  return result;
};
