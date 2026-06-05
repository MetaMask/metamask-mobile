import { type MarketTypeFilter } from '@metamask/perps-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PerpsProductsProps {
  /**
   * Active A/B test entries forwarded to the market list screen so trades
   * opened from a category pill can be attributed to the experiment.
   */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export interface CategoryPillConfig {
  /** MarketTypeFilter value passed as navigation param */
  category: Exclude<MarketTypeFilter, 'all'>;
  /** i18n key for the pill label */
  labelKey: string;
}
