import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { RootState } from '../../../../reducers';
import { selectTransactionMetadataById } from '../../../../selectors/transactionController';
import {
  type ActivityListItem,
  getLocalTransactionMetaId,
} from '../../../../util/activity-adapters';

export function useLocalTransactionMeta(
  item: ActivityListItem | undefined,
): ReturnType<typeof selectTransactionMetadataById> {
  const metaId = item ? getLocalTransactionMetaId(item) : undefined;

  return useLocalTransactionMetaById(metaId);
}

export function useLocalTransactionMetaById(
  metaId: string | undefined,
): ReturnType<typeof selectTransactionMetadataById> {
  return useSelector((state: RootState) =>
    metaId ? selectTransactionMetadataById(state, metaId) : undefined,
  );
}

export function useApiEvmTransactionByHash(
  hash: string | undefined,
  pages: V1TransactionByHashResponse[][] | undefined,
): V1TransactionByHashResponse | undefined {
  return useMemo(() => {
    if (!hash || !pages) {
      return undefined;
    }
    const normalizedHash = hash.toLowerCase();
    for (const page of pages) {
      const match = page.find(
        (transaction) => transaction.hash?.toLowerCase() === normalizedHash,
      );
      if (match) {
        return match;
      }
    }
    return undefined;
  }, [hash, pages]);
}
