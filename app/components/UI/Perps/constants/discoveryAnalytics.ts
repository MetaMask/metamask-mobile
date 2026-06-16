/**
 * Mobile-local analytics constants for the Perps Discovery system.
 *
 * These values extend PERPS_EVENT_PROPERTY and PERPS_EVENT_VALUE from
 * @metamask/perps-controller for discovery-specific tracking. All constants
 * here are pending upstreaming into the core package.
 *
 * TODO: upstream to @metamask/perps-controller (follow-up ticket)
 */

/**
 * Additional property keys not yet in PERPS_EVENT_PROPERTY.
 */
export const PERPS_DISCOVERY_PROPERTY = {
  /** Section of the source screen that triggered navigation to asset details. */
  SOURCE_SECTION: 'source_section',
  /** Number of search results returned by a market search. */
  RESULT_COUNT: 'result_count',
} as const;

/**
 * Additional source values for home sections not yet in PERPS_EVENT_VALUE.SOURCE.
 */
export const PERPS_DISCOVERY_SOURCE = {
  /** User tapped a market in the What's Happening section on Perps home. */
  PERPS_HOME_WHATS_HAPPENING: 'perps_home_whats_happening',
  /** User tapped a market in the Top Gainers (desc) view on Perps home. */
  PERPS_HOME_TOP_GAINERS: 'perps_home_top_gainers',
  /** User tapped a market in the Top Losers (asc) view on Perps home. */
  PERPS_HOME_TOP_LOSERS: 'perps_home_top_losers',
  /** User tapped a market in the Commodities section on Perps home. */
  PERPS_HOME_EXPLORE_COMMODITIES: 'perps_home_explore_commodities',
  /** User tapped a market in the Forex section on Perps home. */
  PERPS_HOME_EXPLORE_FOREX: 'perps_home_explore_forex',
} as const;

/**
 * Additional button_clicked values for home section header taps.
 */
export const PERPS_DISCOVERY_BUTTON_CLICKED = {
  /** User tapped the What's Happening section header. */
  WHATS_HAPPENING: 'whats_happening',
  /** User tapped the Watchlist section header ("See all"). */
  WATCHLIST: 'watchlist',
  /** User tapped the Top Movers section header ("See all"). */
  TOP_MOVERS: 'top_movers',
} as const;

/**
 * Additional interaction_type values for market list interactions.
 */
export const PERPS_DISCOVERY_INTERACTION_TYPE = {
  /** User tapped a filter badge (crypto, stocks, etc.) in the market list. */
  MARKET_LIST_FILTER: 'market_list_filter',
} as const;

/**
 * Additional button_location values not yet in PERPS_EVENT_VALUE.BUTTON_LOCATION.
 * Note: the existing enum uses `perp_market_details` for the asset details screen.
 * The spec requests `asset_details` — align with dashboard owner before finalizing.
 */
export const PERPS_DISCOVERY_BUTTON_LOCATION = {
  /** Asset details / market detail screen (maps to spec's "asset_details"). */
  ASSET_DETAILS: 'asset_details',
} as const;

/**
 * source_section values used when source = perp_markets (navigating from
 * market list to asset details). Communicates which filter was active.
 */
export const PERPS_DISCOVERY_SOURCE_SECTION = {
  /** No active filter (All tab). */
  ALL_MARKETS: 'all_markets',
  /** Crypto filter active. */
  CRYPTO: 'crypto',
  /** Stock filter active. */
  STOCK: 'stock',
  /** Commodity filter active. */
  COMMODITY: 'commodity',
  /** Forex filter active. */
  FOREX: 'forex',
  /** New markets filter active. */
  NEW: 'new',
  /** Watchlist filter active. */
  WATCHLIST: 'watchlist',
  /** User had an active search query when tapping a market. */
  ACTIVE_SEARCH: 'active_search',
} as const;

export type PerpsDiscoverySourceSection =
  (typeof PERPS_DISCOVERY_SOURCE_SECTION)[keyof typeof PERPS_DISCOVERY_SOURCE_SECTION];
