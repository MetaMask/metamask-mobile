import { useSelector } from 'react-redux';
import type { RootState } from '../../../../reducers';
import {
  selectTransactionMetadataByHash,
  selectTransactionMetadataById,
} from '../../../../selectors/transactionController';

export function useLocalTransactionMeta(identifier: string | undefined) {
  return useSelector((state: RootState) => {
    if (!identifier) {
      return undefined;
    }

    return (
      selectTransactionMetadataByHash(state, identifier) ??
      selectTransactionMetadataById(state, identifier)
    );
  });
}
