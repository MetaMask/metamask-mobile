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
   * Each window is fetched via fetchWindowWithAutoSplit, which recursively
   * halves any window that hits FUNDING_HISTORY_API_LIMIT, guaranteeing
   * complete results regardless of position count or trading activity.
   */
  FUNDING_HISTORY_PAGE_WINDOW_DAYS: 30,
  /**
   * HyperLiquid API returns at most this many records per userFunding call.
   * When a single window exceeds this, only the oldest records are returned —
   * the pagination strategy avoids this by using small enough windows.
   */
  FUNDING_HISTORY_API_LIMIT: 500,
  /**
   * Minimum window size (ms) for the auto-split recursion in getFunding.
   * HyperLiquid's funding interval is 8 h, so a 1-hour window holds at most
   * a fraction of one event per position — well under the 500-record cap.
   */
  MIN_SPLIT_WINDOW_MS: 60 * 60 * 1000,
} as const;
