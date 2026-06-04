import { type MarketTypeFilter } from '@metamask/perps-controller';

export interface PerpsProductsProps {
  /**
   * Market counts by category, used to hide pills for categories with no markets.
   * Keys align with MarketTypeFilter values used by `getMarketCategories()`.
   */
  marketCounts: Partial<Record<MarketTypeFilter, number>>;
  /**
   * Analytics source for navigation tracking
   */
  source?: string;
  /**
   * Optional test ID
   */
  testID?: string;
}

export interface CategoryPillConfig {
  /** MarketTypeFilter value passed as navigation param */
  category: Exclude<MarketTypeFilter, 'all'>;
  /** i18n key for the pill label */
  labelKey: string;
  /** Unicode symbol shown beside the label */
  icon: string;
}
