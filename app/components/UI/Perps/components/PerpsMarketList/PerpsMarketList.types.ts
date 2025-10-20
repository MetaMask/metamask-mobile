import type { PerpsMarketData } from '../../controllers/types';
import type { SortField } from '../../utils/sortMarkets';

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
   * @default HOME_SCREEN_CONFIG.DEFAULT_ICON_SIZE
   */
  iconSize?: number;
  /**
   * Current sort field to determine what metric to display in rows
   * @default 'volume'
   */
  sortBy?: SortField;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
