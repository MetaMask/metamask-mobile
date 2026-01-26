import type { SortOptionId } from '../../../../constants/perpsConfig';
import type { MarketTypeFilter } from '../../../../controllers/types';

/**
 * Props for PerpsMarketFiltersBar component
 */
export interface PerpsMarketFiltersBarProps {
  /**
   * Currently selected sort option ID
   */
  selectedOptionId: SortOptionId;

  /**
   * Callback when sort dropdown is pressed
   */
  onSortPress: () => void;

  /**
   * Whether to show market type dropdown
   */
  showMarketTypeDropdown?: boolean;

  /**
   * Selected market type filter
   */
  marketTypeFilter?: MarketTypeFilter;

  /**
   * Callback when market type dropdown is pressed
   */
  onMarketTypePress?: () => void;

  /**
   * Whether to show stocks/commodities dropdown (only for Stocks tab)
   */
  showStocksCommoditiesDropdown?: boolean;

  /**
   * Selected stocks/commodities filter
   */
  stocksCommoditiesFilter?: 'all' | 'equity' | 'commodity';

  /**
   * Callback when stocks/commodities dropdown is pressed
   */
  onStocksCommoditiesPress?: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
