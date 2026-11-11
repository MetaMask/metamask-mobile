import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import {
  selectLocalActivityItems,
  selectLocalTransactionGroups,
} from '../../../../selectors/activity';
import { selectLocalTransactions } from '../../../../selectors/transactionController';
import { equalsIgnoreCase } from '../../../../util/string';

const QUEUE_BLOCKING_STATUSES = new Set<string>([
  TransactionStatus.submitted,
  TransactionStatus.signed,
  'approved',
  'unapproved',
]);

/**
 * Returns whether the pending transaction has the lowest nonce among all pending
 * transactions for the same sender+chain, which determines if it is "earliest".
 */
function computeIsEarliestNonce(
  tx: TransactionMeta,
  allLocalTxs: TransactionMeta[],
): boolean {
  const { txParams } = tx;
  if (
    !txParams?.from ||
    txParams.nonce === undefined ||
    txParams.nonce === null
  ) {
    return true;
  }
  const ownNonce = Number(txParams.nonce);

  return !allLocalTxs.some((other) => {
    if (other.id === tx.id) return false;
    if (!QUEUE_BLOCKING_STATUSES.has(other.status)) return false;
    const otherNonce = Number(other.txParams?.nonce);
    return (
      equalsIgnoreCase(other.txParams?.from, txParams.from) &&
      other.chainId === tx.chainId &&
      otherNonce < ownNonce
    );
  });
}

// Extension: useLocalTransactions
export function useLocalActivityItems() {
  const items = useSelector(selectLocalActivityItems);
  const groups = useSelector(selectLocalTransactionGroups);
  const localTransactions = useSelector(selectLocalTransactions);

  return useMemo(() => {
    const metas = localTransactions.filter((tx): tx is TransactionMeta =>
      Boolean(tx && typeof tx === 'object' && 'txParams' in tx),
    );
    return items.map((item, index) => {
      const group = groups[index];
      if (!group) {
        return item;
      }

      return {
        ...item,
        isEarliestNonce: computeIsEarliestNonce(
          group.primaryTransaction,
          metas,
        ),
      };
    });
  }, [groups, items, localTransactions]);
}
