/* eslint-disable import-x/no-restricted-paths -- TODO(ADR-0020): shared activity filter params; route-isolation backlog */
import type {
  ActivityTypeFilter,
  PerpsActivityFilter,
} from '../ActivityScreen/types';
/* eslint-enable import-x/no-restricted-paths */

/**
 * Transactions view navigation parameters
 */
export interface TransactionsViewParams {
  redirectToOrders?: boolean;
  redirectToPerpsTransactions?: boolean;
  initialTypeFilter?: ActivityTypeFilter;
  initialPerpsFilter?: PerpsActivityFilter;
}

/** Transaction details parameters */
export interface TransactionDetailsParams {
  transactionId?: string;
}
