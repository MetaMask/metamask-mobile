import {
  type PerpsMarketData,
  type SortField,
} from '@metamask/perps-controller';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Props for PerpsMarketList component
 * Reusable FlashList wrapper with consistent configuration
 */
export interface PerpsMarketListProps {
  /**
   * Markets to display
   */
  markets: PerpsMarketData[];
  /**
   * Callback when a market is pressed
   */
  onMarketPress: (market: PerpsMarketData) => void;
  /**
   * Message to display when list is empty
   * @default 'perps.home.no_markets'
   */
  emptyMessage?: string;
  /**
   * Optional header component to render above the list
   */
  ListHeaderComponent?:
    | React.ComponentType<unknown>
    | React.ReactElement
    | null;
  /**
   * Optional icon size for market row items
   * @default HOME_SCREEN_CONFIG.DefaultIconSize
   */
  iconSize?: number;
  /**
   * Current sort field to determine what metric to display in rows
   * @default 'volume'
   */
  sortBy?: SortField;
  /**
   * Whether to show market type badges (STOCK, COMMODITY, FOREX) on row items
   * @default true
   */
  showBadge?: boolean;
  /**
   * Optional style for the FlashList content container
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Optional vertical padding for each market row item.
   * Used for compact displays (e.g., search results).
   */
  rowVerticalPadding?: number;
  /**
   * Optional fixed height for each market row item.
   * Used for compact displays (e.g., search results).
   */
  rowHeight?: number;
  /**
   * Compact mode for market row items.
   * Used for compact displays (e.g., search results).
   */
  rowIsCompact?: boolean;
  /**
   * Optional key to force FlashList re-mount when filters change.
   * This fixes rendering issues when data changes rapidly.
   */
  filterKey?: string;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
