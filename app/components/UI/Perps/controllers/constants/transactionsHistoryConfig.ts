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
} as const;
