import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PerpsProductsProps {
  /**
   * Active A/B test entries forwarded to the market list screen so trades
   * opened from a category pill can be attributed to the experiment.
   */
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}
