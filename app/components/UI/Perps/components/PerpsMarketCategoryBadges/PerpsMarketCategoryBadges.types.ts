import { type MarketTypeFilter } from '@metamask/perps-controller';

export interface PerpsMarketCategoryBadgesProps {
  /**
   * Currently selected category filter ('all' means no category selected)
   */
  selectedCategory: MarketTypeFilter;
  /**
   * Callback when a category is selected
   */
  onCategorySelect: (category: MarketTypeFilter) => void;
  /**
   * Optional test ID for E2E testing
   */
  testID?: string;
}
