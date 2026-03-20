import { TransactionMeta } from '@metamask/transaction-controller';
import { createDeepEqualSelector } from '../../../../selectors/util';
import { selectTransactions } from '../../../../selectors/transactionController';
import { MERKL_CLAIM_ORIGIN } from '../components/MerklRewards/constants';

/**
 * Selects only Merkl claim transactions from the full transaction list.
 *
 * Uses deep-equal memoization so that consumers only re-render when
 * Merkl-specific transactions actually change, not on every unrelated
 * transaction status update.
 */
export const selectMerklClaimTransactions = createDeepEqualSelector(
  [selectTransactions],
  (transactions): TransactionMeta[] =>
    transactions.filter((tx) => tx.origin === MERKL_CLAIM_ORIGIN),
);
