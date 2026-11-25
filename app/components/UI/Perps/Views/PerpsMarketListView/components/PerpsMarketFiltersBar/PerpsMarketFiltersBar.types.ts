import {
  type SortDirection,
  type SortOptionId,
  type MarketTypeFilter,
} from '@metamask/perps-controller';
import type { PerpsProviderLogoId } from '../../../../hooks/usePerpsProviderLogoIds';

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
   * Active sort direction, forwarded to the sort dropdown accessory.
   */
  sortDirection?: SortDirection;

  /**
   * Selected market type filter
   */
  marketTypeFilter: MarketTypeFilter;

  /**
   * Callback when a category is selected
   */
  onCategorySelect: (category: MarketTypeFilter) => void;

  /**
   * Number of markets currently shown in the list (reflects active filters).
   * Displayed on the left of the sort row.
   */
  marketCount: number;

  /**
   * Whether to show the watchlist (star) filter badge.
   */
  showWatchlistBadge?: boolean;

  /**
   * Whether the watchlist filter badge is currently active
   */
  isWatchlistSelected?: boolean;

  /**
   * Callback when the watchlist badge is pressed
   */
  onWatchlistToggle?: () => void;

  /**
   * Whether to render row 1 (category badges). Defaults to `true`.
   * Set `false` when the caller renders the category row separately
   * (e.g. above another section that must sit between the two rows).
   */
  showCategoryRow?: boolean;

  /**
   * Whether to render row 2 (market count + sort dropdown). Defaults to `true`.
   */
  showSortRow?: boolean;

  /**
   * Callback when the market-count selector is pressed. When set, the
   * count row (logos + "N markets" + chevron) is a button that opens the
   * exchange filter sheet (TAT-4511/TAT-4518 design). When omitted the
   * count renders as plain text (single-provider mode or flag off).
   */
  onExchangeFilterPress?: () => void;

  /**
   * Exchange marks to draw immediately left of the market count, in
   * left-to-right order. Omitted or empty renders no mark (single-provider
   * mode or the Lighter flag off). TAT-4511.
   */
  providerIds?: readonly PerpsProviderLogoId[];

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
