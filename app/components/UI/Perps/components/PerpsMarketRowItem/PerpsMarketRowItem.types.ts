import type { ComponentProps } from 'react';
import type { ListItem } from '@metamask/design-system-react-native';
import {
  type PerpsMarketData,
  type SortField,
} from '@metamask/perps-controller';

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
  /** Callback when the row is long-pressed. */
  onLongPress?: () => void;
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
   * When true, uses reduced vertical padding (8px instead of 16px).
   * Useful when embedded in feed cards alongside other row item types.
   * @default false
   */
  compact?: boolean;
  /**
   * Whether this row subscribes to live price updates.
   * @default true
   */
  enableLivePrices?: boolean;
  /**
   * When provided, renders a trailing outline star button (e.g. add to watchlist).
   * The callback receives the current displayMarket (with live price merged in).
   */
  onAddPress?: (market: PerpsMarketData) => void;
  /**
   * When provided, renders a trailing watchlist toggle star button.
   */
  onWatchlistPress?: (market: PerpsMarketData) => void;
  /** Whether the market is currently watchlisted (renders a filled star). */
  isWatchlisted?: boolean;
  /** Optional utility classes when embedding the row in another list. */
  twClassName?: string;
  accessibilityActions?: ComponentProps<
    typeof ListItem
  >['accessibilityActions'];
  onAccessibilityAction?: ComponentProps<
    typeof ListItem
  >['onAccessibilityAction'];
}
