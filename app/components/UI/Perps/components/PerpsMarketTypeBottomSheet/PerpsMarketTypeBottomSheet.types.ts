import type { MarketTypeFilter } from '../../controllers/types';

/**
 * Props for PerpsMarketTypeBottomSheet component
 */
export interface PerpsMarketTypeBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet should close
   */
  onClose: () => void;
  /**
   * Currently selected market type filter
   */
  selectedFilter: MarketTypeFilter;
  /**
   * Callback when a filter option is selected
   * @param filter - The selected market type filter
   */
  onFilterSelect: (filter: MarketTypeFilter) => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}

/**
 * Market type filter option configuration
 */
export interface MarketTypeFilterOption {
  /**
   * Unique identifier for the filter option
   */
  id: MarketTypeFilter;
  /**
   * i18n key for the option label
   */
  labelKey: string;
}
