import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { RootState } from '../../../../reducers';
import { selectTransactionMetadataByHash } from '../../../../selectors/transactionController';

export function useLocalTransactionMeta(
  hash: string | undefined,
): TransactionMeta | undefined {
  return useSelector((state: RootState) =>
    selectTransactionMetadataByHash(state, hash),
  );
}
