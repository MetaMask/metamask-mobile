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
   * Optional filter identifier forwarded to FlashList as `extraData` so rows
   * re-render when the active filter changes WITHOUT remounting the list (which
   * would tear down and recreate every row's live-price subscription).
   */
  filterKey?: string;
  /**
   * Optional token that, when it changes, resets the scroll position back to
   * the top (revealing the list header). Use it to key on more than the
   * category — e.g. toggling search on/off — so the header scrolls back into
   * view. Falls back to {@link filterKey} when omitted.
   */
  scrollResetKey?: string;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
