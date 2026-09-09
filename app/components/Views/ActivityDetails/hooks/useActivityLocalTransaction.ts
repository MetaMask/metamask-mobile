import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { RootState } from '../../../../reducers';
import {
  selectTransactionMetadataByHash,
  selectTransactionMetadataById,
} from '../../../../selectors/transactionController';
import type { ActivityListItem } from '../../../../util/activity-adapters';

/**
 * The local transaction behind an activity row.
 *
 * A local row's own copy can be a stale navigation-time snapshot, so the live
 * one is re-read by id first. Provider-backed rows (Perps, Predict) are
 * matched on hash instead, scoped to the row's chain since that selector
 * matches on hash alone.
 *
 * @param item - Row to resolve.
 * @param enabled - When false, the selectors bail immediately and recompute
 * nothing.
 */
export function useActivityLocalTransaction(
  item: ActivityListItem,
  enabled = true,
): TransactionMeta | undefined {
  const snapshot =
    item.raw?.type === 'localTransaction'
      ? item.raw.data.primaryTransaction
      : undefined;
  const { hash, chainId } = item;

  const live = useSelector((state: RootState) =>
    enabled && snapshot?.id
      ? selectTransactionMetadataById(state, snapshot.id)
      : undefined,
  );

  const byHash = useSelector((state: RootState) => {
    if (!enabled || snapshot) {
      return undefined;
    }

    const meta = selectTransactionMetadataByHash(state, hash);
    return meta && toEvmCaipChainId(meta.chainId) === chainId
      ? meta
      : undefined;
  });

  if (!enabled) {
    return undefined;
  }

  return live ?? snapshot ?? byHash;
}
