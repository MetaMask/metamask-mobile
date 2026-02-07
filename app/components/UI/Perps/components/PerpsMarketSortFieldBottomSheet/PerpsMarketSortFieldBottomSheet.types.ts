import type {
  SortField,
  SortDirection,
} from '@metamask/perps-controller/utils/sortMarkets';
import type { SortOptionId } from '@metamask/perps-controller/constants/perpsConfig';

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
   * Current sort direction (used for price change toggle and default for other options)
   */
  sortDirection: SortDirection;
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
   * Test ID for E2E testing
   */
  testID?: string;
}
