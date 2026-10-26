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
 *
 * Client-local until `@metamask/perps-controller` adds this value to
 * `PERPS_EVENT_VALUE.BUTTON_LOCATION`. Pro asset-details Screen Viewed
 * forwards the route param when an entry point sets it.
 */
export const PERPS_SECTION_HEADER_BUTTON_LOCATION = 'perps_section_header';

export interface ResolvePerpsHeaderEntryTargetArgs {
  /** Pro mode is active, or the user is committing a switch into Pro. */
  isEligible: boolean;
  destination: PerpsHeaderNavVariantConfig['destination'];
  watchlistCount: number;
  /**
   * When false, saved symbols cannot be shown, so treatment opens All.
   * Defaults to on so callers that have not read the flag keep Watchlist.
   */
  isWatchlistEnabled?: boolean;
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
 * Resolves where a Pro entry point opens.
 *
 * Ineligible (Lite/casual) callers keep today's home target and must not
 * branch on `destination`. Treatment opens the market list on Watchlist when
 * the watchlist feature is on and it has at least one symbol, otherwise All.
 * Control keeps the last-viewed market, or BTC.
 */
export const resolvePerpsHeaderEntryTarget = ({
  isEligible,
  destination,
  watchlistCount,
  isWatchlistEnabled = true,
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

  const visibleWatchlistCount = isWatchlistEnabled ? watchlistCount : 0;

  return {
    screen: Routes.PERPS.MARKET_LIST,
    params: marketListParams(visibleWatchlistCount, extraParams),
  };
};
