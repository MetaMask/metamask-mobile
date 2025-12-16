/**
 * Perps feature constants
 */
export const PERPS_TRANSACTIONS_HISTORY_CONSTANTS = {
  FLASH_LIST_DRAW_DISTANCE: 200,
  FLASH_LIST_SCROLL_EVENT_THROTTLE: 16,
  LIST_ITEM_SELECTOR_OPACITY: 0.7,
  /**
   * Default number of days to look back for funding history.
   * HyperLiquid API requires a startTime and returns max 500 records.
   * Using 365 days ensures most users see their complete recent history.
   * Can be increased if users need older funding data.
   */
  DEFAULT_FUNDING_HISTORY_DAYS: 365,
  /**
   * Maximum number of transactions to display per filter tab.
   * Caps the number of transactions stored in state to reduce rendering overhead.
   * This is Step 1 of performance optimization - future steps include API limits and caching.
   */
  TRANSACTIONS_HISTORY_LIMIT: 100,
  /**
   * Number of transactions to fetch per page for infinite scroll.
   * Used for time-based pagination with the HyperLiquid API.
   */
  PAGE_SIZE: 50,
  /**
   * Threshold for triggering onEndReached in FlashList.
   * 0.5 means load more when user is 50% away from the end.
   */
  ON_END_REACHED_THRESHOLD: 0.5,
} as const;
