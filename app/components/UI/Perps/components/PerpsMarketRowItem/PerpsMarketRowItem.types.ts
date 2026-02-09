import type { PerpsMarketData } from '../../controllers/types';
import type { SortField } from '../../utils/sortMarkets';

/**
 * Props for PerpsMarketRowItem component
 */
export interface PerpsMarketRowItemProps {
  /**
   * Market data to display in the row
   */
  market: PerpsMarketData;
  /**
   * Callback when the row is pressed
   */
  onPress?: (market: PerpsMarketData) => void;
  /**
   * Size of the token icon (defaults to HOME_SCREEN_CONFIG.DefaultIconSize)
   */
  iconSize?: number;
  /**
   * Metric to display in the subtitle area
   * - 'volume': Shows 24h trading volume (default)
   * - 'priceChange': Shows 24h price change percentage
   * - 'openInterest': Shows open interest value
   * - 'fundingRate': Shows current funding rate
   * @default 'volume'
   */
  displayMetric?: SortField;
  /**
   * Whether to show the market type badge (STOCK, COMMODITY, FOREX)
   * Should be true in watchlist (mixed types) but false in type-specific sections/tabs
   * @default true
   */
  showBadge?: boolean;
  /**
   * Legacy compact mode.
   * When true, uses reduced vertical padding and compact inner spacing.
   * @default false
   */
  compact?: boolean;
  /**
   * Optional vertical padding for the row container.
   * Used for compact displays (e.g., search results).
   */
  verticalPadding?: number;
  /**
   * Optional fixed height for the row container.
   * Used for compact displays (e.g., search results).
   */
  rowHeight?: number;
  /**
   * Compact mode for search results.
   * Adjusts internal spacing to fit the compact row height.
   */
  isCompact?: boolean;
}
