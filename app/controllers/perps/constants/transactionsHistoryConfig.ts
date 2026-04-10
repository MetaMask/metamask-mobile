/**
 * Perps feature constants
 */
export const PERPS_TRANSACTIONS_HISTORY_CONSTANTS = {
  FLASH_LIST_DRAW_DISTANCE: 200,
  FLASH_LIST_SCROLL_EVENT_THROTTLE: 16,
  LIST_ITEM_SELECTOR_OPACITY: 0.7,
  /**
   * Default number of days to look back for funding history.
   * HyperLiquid API requires a startTime and returns max 500 records per call.
   * The full range is fetched in parallel page windows to ensure newest records
   * are always included regardless of total history length.
   */
  DEFAULT_FUNDING_HISTORY_DAYS: 365,
  /**
   * Number of days per pagination window when fetching funding history.
   * Each window is fetched in parallel. A 30-day window stays well under the
   * API limit for any realistic number of open positions.
   */
  FUNDING_HISTORY_PAGE_WINDOW_DAYS: 30,
  /**
   * HyperLiquid API returns at most this many records per userFunding call.
   * When a single window exceeds this, only the oldest records are returned —
   * the pagination strategy avoids this by using small enough windows.
   */
  FUNDING_HISTORY_API_LIMIT: 500,
} as const;
