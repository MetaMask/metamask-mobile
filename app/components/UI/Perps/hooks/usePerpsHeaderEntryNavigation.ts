import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_HEADER_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_HEADER_AB_TEST_KEY,
  PERPS_HEADER_NAV_VARIANTS,
} from '../abTestConfig';
import { selectPerpsWatchlistEnabledFlag } from '../selectors/featureFlags';
import {
  selectPerpsLastViewedMarketSymbol,
  selectPerpsWatchlistMarkets,
} from '../selectors/perpsController';
import { resolvePerpsHeaderEntryTarget } from '../utils/perpsHeaderEntryNavigation';
import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  useIsPerpsProModeActive,
  type PerpsHomeNavigationTarget,
} from '../utils/perpsModeSwitch';

export interface UsePerpsHeaderEntryNavigationOptions {
  /**
   * When false, resolves the assignment without Experiment Viewed.
   * Defaults to the current Pro-mode eligibility so Lite surfaces are not
   * enrolled. Pass true when a Lite user commits to switching into Pro.
   */
  trackExposure?: boolean;
}

export interface UsePerpsHeaderEntryNavigationResult {
  /**
   * Wallet-home "go to Perps" target. Lite/casual users keep Perps Home
   * even when the remote assignment is treatment.
   */
  getTarget: (
    extraParams?: Record<string, unknown>,
  ) => PerpsHomeNavigationTarget;
  /**
   * Destination after a committed switch into Pro (lite pill / mode chooser).
   * Always eligible, because the caller has already chosen Pro.
   */
  getProSwitchTarget: (
    extraParams?: Record<string, unknown>,
  ) => PerpsHomeNavigationTarget;
}

export function usePerpsHeaderEntryNavigation(
  options?: UsePerpsHeaderEntryNavigationOptions,
): UsePerpsHeaderEntryNavigationResult {
  const isProModeActive = useIsPerpsProModeActive();
  const isWatchlistEnabled = useSelector(selectPerpsWatchlistEnabledFlag);
  const lastViewedMarketSymbol = useSelector(selectPerpsLastViewedMarketSymbol);
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);
  const watchlistCount = Array.isArray(watchlistSymbols)
    ? watchlistSymbols.length
    : 0;
  const lastViewed =
    typeof lastViewedMarketSymbol === 'string' &&
    lastViewedMarketSymbol.length > 0
      ? lastViewedMarketSymbol
      : PERPS_DEFAULT_PRO_MARKET_SYMBOL;
  const trackExposure = options?.trackExposure ?? isProModeActive;

  const { variant } = useABTest(
    PERPS_HEADER_AB_TEST_KEY,
    PERPS_HEADER_NAV_VARIANTS,
    {
      ...PERPS_HEADER_AB_TEST_EXPOSURE_OPTIONS,
      trackExposure,
    },
  );

  const destination = variant?.destination ?? 'lastViewedMarket';

  const getTarget = useCallback(
    (extraParams?: Record<string, unknown>) =>
      resolvePerpsHeaderEntryTarget({
        isEligible: isProModeActive,
        destination,
        watchlistCount,
        isWatchlistEnabled,
        extraParams,
        lastViewedMarketSymbol: lastViewed,
      }),
    [
      destination,
      isProModeActive,
      isWatchlistEnabled,
      lastViewed,
      watchlistCount,
    ],
  );

  const getProSwitchTarget = useCallback(
    (extraParams?: Record<string, unknown>) =>
      resolvePerpsHeaderEntryTarget({
        isEligible: true,
        destination,
        watchlistCount,
        isWatchlistEnabled,
        extraParams,
        lastViewedMarketSymbol: lastViewed,
      }),
    [destination, isWatchlistEnabled, lastViewed, watchlistCount],
  );

  return {
    getTarget,
    getProSwitchTarget,
  };
}
