import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { useNowOnScreenFocus } from './useNowOnScreenFocus';
import { isRecentlyListed } from '../utils/time';
import { selectPerpsTerminalBackendEnabledFlag } from '../selectors/featureFlags';

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
 *
 * `listedAt` is only populated when the Terminal backend enriches market data
 * (`selectPerpsTerminalBackendEnabledFlag`) — the direct-provider path never
 * sets it. This hook therefore returns `false` whenever that flag is off,
 * even if a stale/cached market happens to carry a `listedAt`, so the "New"
 * pill/badge never appears for a cohort where the underlying data isn't
 * guaranteed. Consumers that navigate straight to the `'new'` market-list
 * filter without going through this hook (e.g. a deep link) will see an
 * empty list rather than an error in that case.
 */
export const useHasNewMarkets = (): boolean => {
  const isTerminalBackendEnabled = useSelector(
    selectPerpsTerminalBackendEnabledFlag,
  );
  const { markets } = usePerpsMarkets();
  const now = useNowOnScreenFocus();

  return useMemo(() => {
    if (!isTerminalBackendEnabled) {
      return false;
    }
    return markets.some((market) => isRecentlyListed(market.listedAt, now));
  }, [isTerminalBackendEnabled, markets, now]);
};
