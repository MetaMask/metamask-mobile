import type { MarketTypeFilter } from '@metamask/perps-controller';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export const EXPLORE_WATCHLIST_TAB_ID = 'watchlist' as const;

export type ExploreTabId =
  | typeof EXPLORE_WATCHLIST_TAB_ID
  | Exclude<MarketTypeFilter, 'all'>;

export interface ExploreTab {
  id: ExploreTabId;
  label: string;
  iconOnly?: boolean;
}

export interface PerpsExploreSectionProps {
  /**
   * Active A/B test entries forwarded to market list and market details so
   * trades opened from Explore can be attributed to the experiments already
   * on the route.
   */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}
