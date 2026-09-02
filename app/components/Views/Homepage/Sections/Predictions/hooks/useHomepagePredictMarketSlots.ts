import { useCallback, useMemo } from 'react';
import {
  usePredictMarketData,
  type UsePredictMarketDataResult,
} from '../../../../../UI/Predict/hooks/usePredictMarketData';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import {
  buildHomepagePredictEventQuery,
  getHomepagePredictEventSlots,
  type HomepagePredictMarketSlot,
} from '../constants/homepagePredictMarketSlots';

interface UseHomepagePredictMarketSlotsArgs {
  enabled: boolean;
  slots: readonly HomepagePredictMarketSlot[];
}

export type UseHomepagePredictMarketSlotsResult = UsePredictMarketDataResult;

export const orderHomepagePredictEventMarkets = (
  markets: PredictMarket[],
  slots: readonly HomepagePredictMarketSlot[],
): PredictMarket[] =>
  getHomepagePredictEventSlots(slots).flatMap(({ id, slug }) => {
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
  slots,
}: UseHomepagePredictMarketSlotsArgs): UseHomepagePredictMarketSlotsResult {
  const eventSlots = useMemo(
    () => getHomepagePredictEventSlots(slots),
    [slots],
  );
  const customQueryParams = useMemo(
    () => buildHomepagePredictEventQuery(slots),
    [slots],
  );
  const refine = useCallback(
    (markets: PredictMarket[]) =>
      orderHomepagePredictEventMarkets(markets, slots),
    [slots],
  );

  return usePredictMarketData({
    category: 'hot',
    customQueryParams,
    pageSize: eventSlots.length,
    refine,
    enabled: enabled && eventSlots.length > 0,
  });
}
