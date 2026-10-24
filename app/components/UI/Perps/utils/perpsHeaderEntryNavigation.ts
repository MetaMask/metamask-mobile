import type { MarketTypeFilter } from '@metamask/perps-controller';
import Routes from '../../../../constants/navigation/Routes';
import type { PerpsHeaderNavVariantConfig } from '../abTestConfig';
import {
  PERPS_DEFAULT_PRO_MARKET_SYMBOL,
  resolvePerpsHomeNavigationTarget,
  type PerpsHomeNavigationTarget,
} from './perpsModeSwitch';

/**
 * Isolates the wallet-home Perps section header from other `home_section`
 * taps (asset tiles, explore pill) on Perp Screen Viewed.
 */
export const PERPS_SECTION_HEADER_BUTTON_LOCATION = 'perps_section_header';

export interface ResolvePerpsHeaderEntryTargetArgs {
  /** Pro mode is active, or the user is committing a switch into Pro. */
  isEligible: boolean;
  destination: PerpsHeaderNavVariantConfig['destination'];
  watchlistCount: number;
  extraParams?: Record<string, unknown>;
  lastViewedMarketSymbol?: string;
}

const marketListParams = (
  watchlistCount: number,
  extraParams: Record<string, unknown>,
): Record<string, unknown> => {
  if (watchlistCount > 0) {
    return {
      ...extraParams,
      showWatchlistOnly: true,
    };
  }

  // Explicit All tab. Omitting these lets a saved category or watchlist
  // filter win, which would skip the empty-watchlist default.
  const allTab: MarketTypeFilter = 'all';
  return {
    ...extraParams,
    showWatchlistOnly: false,
    defaultMarketTypeFilter: allTab,
  };
};

/**
 * Resolves a Pro entry destination for the TAT-4021 experiment.
 *
 * Ineligible (Lite/casual) callers keep today's home target and must not
 * branch on `destination`. Treatment opens the market list on Watchlist when
 * the watchlist has at least one symbol, otherwise All. Control keeps the
 * last-viewed market, or BTC.
 */
export const resolvePerpsHeaderEntryTarget = ({
  isEligible,
  destination,
  watchlistCount,
  extraParams = {},
  lastViewedMarketSymbol = PERPS_DEFAULT_PRO_MARKET_SYMBOL,
}: ResolvePerpsHeaderEntryTargetArgs): PerpsHomeNavigationTarget => {
  if (!isEligible || destination !== 'marketList') {
    return resolvePerpsHomeNavigationTarget(
      isEligible,
      extraParams,
      lastViewedMarketSymbol,
    );
  }

  return {
    screen: Routes.PERPS.MARKET_LIST,
    params: marketListParams(watchlistCount, extraParams),
  };
};
