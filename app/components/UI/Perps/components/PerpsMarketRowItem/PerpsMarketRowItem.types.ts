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
  /**
   * Callback when the row is long-pressed.
   */
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
   * Whether to include the ticker/pair prefix in the description.
   * @default true
   */
  showDescriptionPrefix?: boolean;
  /**
   * Disables the row-level live price subscription for bounded/static rails.
   */
  enableLivePrices?: boolean;
  /**
   * When provided, renders a trailing outline star button (e.g. add to watchlist).
   * The callback receives the current displayMarket (with live price merged in).
   */
  onAddPress?: (market: PerpsMarketData) => void;
  /**
   * When provided, renders a filled/outline favorite button for a market that
   * already belongs to a watchlist.
   */
  onWatchlistPress?: (market: PerpsMarketData) => void;
  /** Whether the favorite button should render as selected. */
  isWatchlisted?: boolean;
  /** Optional ListItem utility classes for embedding the row in a padded list. */
  twClassName?: ComponentProps<typeof ListItem>['twClassName'];
  accessibilityActions?: ComponentProps<
    typeof ListItem
  >['accessibilityActions'];
  onAccessibilityAction?: ComponentProps<
    typeof ListItem
  >['onAccessibilityAction'];
}
