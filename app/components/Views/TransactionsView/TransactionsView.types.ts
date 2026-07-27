// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared activity type-filter param; route-isolation backlog
import type { ActivityTypeFilter } from '../ActivityScreen/types';

/**
 * Transactions view navigation parameters
 */
export interface TransactionsViewParams {
  redirectToOrders?: boolean;
  redirectToPerpsTransactions?: boolean;
  initialTypeFilter?: ActivityTypeFilter;
}

/** Transaction details parameters */
export interface TransactionDetailsParams {
  transactionId?: string;
}
