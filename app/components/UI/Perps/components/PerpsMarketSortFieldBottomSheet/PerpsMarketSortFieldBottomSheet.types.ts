import type { SortField, SortDirection } from '../../utils/sortMarkets';
import type { SortOptionId } from '../../constants/perpsConfig';

/**
 * Props for PerpsMarketSortFieldBottomSheet component
 */
export interface PerpsMarketSortFieldBottomSheetProps {
  /**
   * Whether the bottom sheet is visible
   */
  isVisible: boolean;
  /**
   * Callback when bottom sheet should close
   */
  onClose: () => void;
  /**
   * Currently selected option ID
   */
  selectedOptionId: SortOptionId;
  /**
   * Callback when an option is selected
   * @param optionId - The ID of the selected option
   * @param field - The sort field
   * @param direction - The sort direction
   */
  onOptionSelect: (
    optionId: SortOptionId,
    field: SortField,
    direction: SortDirection,
  ) => void;
  /**
   * Whether watchlist filter is active
   */
  showFavoritesOnly?: boolean;
  /**
   * Callback when watchlist toggle is pressed
   */
  onFavoritesToggle?: () => void;
  /**
   * Test ID for E2E testing
   */
  testID?: string;
}
