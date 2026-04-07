import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectPredictUpDownEnabledFlag } from '../selectors/featureFlags';
import { deduplicateSeriesMarkets } from '../utils/feed';
import type { PredictMarket } from '../types';

/**
 * Deduplicates Crypto Up/Down series markets when `predictUpDownEnabled` is on.
 * Returns the input array unchanged when the flag is off.
 */
export function usePredictFeedItems(
  marketData: PredictMarket[],
): PredictMarket[] {
  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);

  return useMemo(() => {
    if (!upDownEnabled) {
      return marketData;
    }

    return deduplicateSeriesMarkets(marketData);
  }, [marketData, upDownEnabled]);
}
