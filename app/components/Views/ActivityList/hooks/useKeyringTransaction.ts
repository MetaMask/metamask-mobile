import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain/multichain';

export function useKeyringTransaction(hash?: string) {
  const nonEvmState = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );

  return useMemo(() => {
    if (!hash) {
      return undefined;
    }

    const normalizedHash = hash.toLowerCase();
    return nonEvmState?.transactions?.find(
      (transaction) => transaction.id?.toLowerCase() === normalizedHash,
    );
  }, [hash, nonEvmState]);
}
