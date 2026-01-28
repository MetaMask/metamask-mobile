/**
 * Market list component configuration constants
 */
export const PERPS_MARKET_LIST_CONSTANTS = {
  FLASH_LIST_DRAW_DISTANCE: 200,
  FLASH_LIST_SCROLL_EVENT_THROTTLE: 16,
  /**
   * Estimated height of each market row item in pixels.
   * Required for FlashList to properly calculate layouts when data changes.
   * Based on: icon (~40px) + text lines + paddingVertical (6*2) = ~72px
   */
  ESTIMATED_ITEM_SIZE: 72,
} as const;
