/**
 * Mobile-local analytics constants for the Perps Discovery system.
 *
 * These constants extend PERPS_EVENT_PROPERTY and PERPS_EVENT_VALUE from
 * @metamask/perps-controller and are structured to mirror the upstream enum
 * shape exactly — making the eventual core PR a near find/replace migration.
 *
 * TODO: upstream to @metamask/perps-controller (follow-up ticket)
 *
 * Core additions pending upstream:
 * - PERPS_EVENT_PROPERTY: SOURCE_SECTION, RESULT_COUNT, SECTION_NAME, SECTION_INDEX, SECTIONS_DISPLAYED, WATCHLIST_COUNT, WATCHLIST_MARKETS
 * - PERPS_EVENT_VALUE.SOURCE_SECTION (new group)
 * - PERPS_EVENT_VALUE.SECTION_NAME (new group)
 * - PERPS_EVENT_VALUE.INTERACTION_TYPE: MARKET_LIST_FILTER
 * - PERPS_EVENT_VALUE.BUTTON_CLICKED: WATCHLIST, TOP_MOVERS, WHATS_HAPPENING
 * - PERPS_EVENT_VALUE.BUTTON_LOCATION: ASSET_DETAILS
 */

// ─── Property keys ────────────────────────────────────────────────────────────

/**
 * Additional property keys for the discovery system.
 * Maps to additions in PERPS_EVENT_PROPERTY.
 */
export const PERPS_DISCOVERY_PROPERTY = {
  /** Sub-section of the origin screen that triggered navigation to asset details. */
  SOURCE_SECTION: 'source_section',
  /** Number of search results returned by a market search. */
  RESULT_COUNT: 'result_count',
  /** Stable identifier for a home screen section (e.g. 'watchlist'). */
  SECTION_NAME: 'section_name',
  /** 1-based position of a section among visible sections on screen. */
  SECTION_INDEX: 'section_index',
  /** Ordered array of section_name values displayed on the home screen. */
  SECTIONS_DISPLAYED: 'sections_displayed',
  /** Number of markets in the user's watchlist at event time. */
  WATCHLIST_COUNT: 'watchlist_count',
  /** Ordered array of market symbols in the user's watchlist at event time. */
  WATCHLIST_MARKETS: 'watchlist_markets',
} as const;

// ─── Section names ────────────────────────────────────────────────────────────

/**
 * Stable identifiers for Perps home screen sections.
 * Maps to the new PERPS_EVENT_VALUE.SECTION_NAME group upstream.
 */
export const PERPS_DISCOVERY_SECTION_NAME = {
  BALANCE: 'balance',
  POSITIONS: 'positions',
  ORDERS: 'orders',
  WATCHLIST: 'watchlist',
  WHATS_HAPPENING: 'whats_happening',
  PRODUCTS: 'products',
  TOP_MOVERS: 'top_movers',
  EXPLORE_CRYPTO: 'explore_crypto',
  EXPLORE_COMMODITIES: 'explore_commodities',
  EXPLORE_STOCKS: 'explore_stocks',
  EXPLORE_FOREX: 'explore_forex',
  RECENT_ACTIVITY: 'recent_activity',
} as const;

// ─── source_section values ────────────────────────────────────────────────────

/**
 * Unified source_section values used alongside `source` to identify the
 * specific sub-section that triggered navigation or a screen view.
 *
 * Maps to the new PERPS_EVENT_VALUE.SOURCE_SECTION group upstream.
 *
 * Partitioned by source:
 * - perps_home: positions | orders | watchlist | whats_happening | products | top_gainers | top_losers | crypto | commodity | stock | forex
 * - explore: perps_movers | perps_crypto | perps_stocks_commodities | perps_markets
 * - perp_markets: all_markets | crypto | stock | commodity | forex | new | watchlist | active_search
 */
export const PERPS_DISCOVERY_SOURCE_SECTION = {
  // ── perps_home sections ──────────────────────────────────────────────────
  POSITIONS: 'positions',
  ORDERS: 'orders',
  WATCHLIST: 'watchlist',
  WHATS_HAPPENING: 'whats_happening',
  PRODUCTS: 'products',
  TOP_GAINERS: 'top_gainers',
  TOP_LOSERS: 'top_losers',
  // The explore-* sections on home reuse the market-category strings so
  // analysts can join on market_category in market-list events.
  CRYPTO: 'crypto',
  COMMODITY: 'commodity',
  STOCK: 'stock',
  FOREX: 'forex',

  // ── explore sections ─────────────────────────────────────────────────────
  PERPS_MOVERS: 'perps_movers',
  PERPS_CRYPTO: 'perps_crypto',
  PERPS_STOCKS_COMMODITIES: 'perps_stocks_commodities',
  PERPS_MARKETS: 'perps_markets',

  // ── perp_markets sections ────────────────────────────────────────────────
  ALL_MARKETS: 'all_markets',
  NEW: 'new',
  ACTIVE_SEARCH: 'active_search',
} as const;

// ─── Interaction types ────────────────────────────────────────────────────────

/**
 * Additional interaction_type values for market list interactions.
 * Maps to additions in PERPS_EVENT_VALUE.INTERACTION_TYPE.
 */
export const PERPS_DISCOVERY_INTERACTION_TYPE = {
  /** User tapped a filter badge (crypto, stocks, watchlist, etc.) in the market list. */
  MARKET_LIST_FILTER: 'market_list_filter',
} as const;

// ─── Button-clicked values ────────────────────────────────────────────────────

/**
 * Additional button_clicked values for discovery section header taps.
 * Maps to additions in PERPS_EVENT_VALUE.BUTTON_CLICKED.
 */
export const PERPS_DISCOVERY_BUTTON_CLICKED = {
  /** User tapped the What's Happening section header. */
  WHATS_HAPPENING: 'whats_happening',
  /** User tapped the Watchlist section header ("See all"). */
  WATCHLIST: 'watchlist',
  /** User tapped the Top Movers section header ("See all"). */
  TOP_MOVERS: 'top_movers',
} as const;

// ─── Button-location values ───────────────────────────────────────────────────

/**
 * Additional button_location values.
 * Maps to additions in PERPS_EVENT_VALUE.BUTTON_LOCATION.
 */
export const PERPS_DISCOVERY_BUTTON_LOCATION = {
  /** Asset details / market detail screen. */
  ASSET_DETAILS: 'asset_details',
} as const;

// ─── Derived types ────────────────────────────────────────────────────────────

export type PerpsDiscoverySourceSection =
  (typeof PERPS_DISCOVERY_SOURCE_SECTION)[keyof typeof PERPS_DISCOVERY_SOURCE_SECTION];

export type PerpsDiscoverySectionName =
  (typeof PERPS_DISCOVERY_SECTION_NAME)[keyof typeof PERPS_DISCOVERY_SECTION_NAME];
