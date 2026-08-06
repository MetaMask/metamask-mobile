import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from '../../../../../UI/Predict/hooks/usePredictMarketData';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import {
  HOMEPAGE_PREDICT_EVENT_QUERY,
  HOMEPAGE_PREDICT_EVENT_SLOTS,
} from '../constants/homepagePredictMarketSlots';

interface UseHomepagePredictMarketSlotsArgs {
  enabled: boolean;
}

export type UseHomepagePredictMarketSlotsResult = UsePredictMarketDataResult;

export const orderHomepagePredictEventMarkets = (
  markets: PredictMarket[],
): PredictMarket[] =>
  HOMEPAGE_PREDICT_EVENT_SLOTS.flatMap(({ id, slug }) => {
    const market = markets.find(
      (candidate) => candidate.id === id && candidate.slug === slug,
    );
    return market ? [market] : [];
  });

/**
 * Loads the configured event-backed homepage slots and restores config order.
 * Gamma does not guarantee that repeated `id` filters preserve request order.
 */
export function useHomepagePredictMarketSlots({
  enabled,
}: UseHomepagePredictMarketSlotsArgs): UseHomepagePredictMarketSlotsResult {
  return usePredictMarketData({
    category: 'hot',
    customQueryParams: HOMEPAGE_PREDICT_EVENT_QUERY,
    pageSize: HOMEPAGE_PREDICT_EVENT_SLOTS.length,
    refine: orderHomepagePredictEventMarkets,
    enabled,
  });
}
