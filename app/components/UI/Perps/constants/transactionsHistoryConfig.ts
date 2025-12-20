/**
 * Perps transaction history constants
 */
export const PERPS_TRANSACTIONS_HISTORY_CONSTANTS = {
  /**
   * Draw distance for FlashList virtualization.
   * Controls how many items are rendered outside the visible area.
   */
  FLASH_LIST_DRAW_DISTANCE: 200,
  /**
   * Scroll event throttle for FlashList.
   * Controls how often scroll events are processed.
   */
  FLASH_LIST_SCROLL_EVENT_THROTTLE: 16,
  /**
   * Opacity for list item selectors.
   */
  LIST_ITEM_SELECTOR_OPACITY: 0.7,
  /**
   * Default number of days to look back for funding history.
   * HyperLiquid API requires a startTime and returns max 500 records.
   * Using 365 days ensures most users see their complete recent history.
   * Can be increased if users need older funding data.
   */
  DEFAULT_FUNDING_HISTORY_DAYS: 365,
} as const;
