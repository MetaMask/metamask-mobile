import { useMemo } from 'react';
import { usePerpsMarkets } from './usePerpsMarkets';
import { useNowOnScreenFocus } from './useNowOnScreenFocus';
import { isRecentlyListed } from '../utils/time';

/**
 * Returns `true` when at least one market in the current markets list was
 * listed within the last 30 days, indicating the "new" category badge/pill
 * should be shown. Uses the same criterion as the "New" market-list filter
 * and the home "Recently added" rail.
 *
 * `usePerpsMarkets` is a cached REST snapshot with no continuous updates, so
 * `now` comes from `useNowOnScreenFocus` rather than `Date.now()` read
 * directly in the memo: without it, a screen that stays mounted across the
 * 30-day boundary would keep returning a stale `true` until something else
 * (e.g. the markets list) changes.
 */
export const useHasNewMarkets = (): boolean => {
  const { markets } = usePerpsMarkets();
  const now = useNowOnScreenFocus();

  return useMemo(
    () => markets.some((market) => isRecentlyListed(market.listedAt, now)),
    [markets, now],
  );
};
