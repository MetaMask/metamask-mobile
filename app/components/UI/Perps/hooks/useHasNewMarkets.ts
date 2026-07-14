import { useMemo } from 'react';
import { usePerpsMarkets } from './usePerpsMarkets';
import { isRecentlyListed } from '../utils/time';

/**
 * Returns `true` when at least one market in the current markets list was
 * listed within the last 30 days, indicating the "new" category badge/pill
 * should be shown. Uses the same criterion as the "New" market-list filter
 * and the home "Recently added" rail.
 */
export const useHasNewMarkets = (): boolean => {
  const { markets } = usePerpsMarkets();

  return useMemo(
    () => markets.some((market) => isRecentlyListed(market.listedAt)),
    [markets],
  );
};
