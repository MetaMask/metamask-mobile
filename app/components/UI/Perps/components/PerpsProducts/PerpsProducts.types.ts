import { type MarketTypeFilter } from '@metamask/perps-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PerpsProductsProps {
  /**
   * Market counts by category, used to hide pills for categories with no markets.
   * Keys align with MarketTypeFilter values used by `getMarketCategories()`.
   */
  marketCounts: Partial<Record<MarketTypeFilter, number>>;
  /**
   * Active A/B test entries forwarded to the market list screen so trades
   * opened from a category pill can be attributed to the experiment.
   */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
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
}
