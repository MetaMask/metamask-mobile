import { useMemo } from 'react';
import { usePerpsMarkets } from './usePerpsMarkets';

/**
 * Returns `true` when at least one market in the current markets list
 * has `isNewMarket` set, indicating the "new" category badge should
 * be shown.
 */
export const useHasNewMarkets = (): boolean => {
  const { markets } = usePerpsMarkets();

  return useMemo(() => markets.some((market) => market.isNewMarket), [markets]);
};
