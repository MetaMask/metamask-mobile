import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';
import type { Transaction as NonEvmTransaction } from '@metamask/keyring-api';

export function useKeyringTransactionById(
  transactionId: string | undefined,
): NonEvmTransaction | undefined {
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );

  return useMemo(() => {
    if (!transactionId) {
      return undefined;
    }
    const normalizedId = transactionId.toLowerCase();
    return nonEvmState?.transactions.find(
      (transaction) => transaction.id.toLowerCase() === normalizedId,
    );
  }, [nonEvmState?.transactions, transactionId]);
}
