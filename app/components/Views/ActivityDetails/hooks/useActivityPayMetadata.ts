import { useSelector } from 'react-redux';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { RootState } from '../../../../reducers';
import { selectTransactionMetadataByHash } from '../../../../selectors/transactionController';
import type { ActivityListItem } from '../../../../util/activity-adapters';

/**
 * @param item - Row to read.
 * @returns Pay metadata on the row's own local transaction, if it has one.
 */
function getLocalPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  return item.raw?.type === 'localTransaction'
    ? item.raw.data.primaryTransaction?.metamaskPay
    : undefined;
}

/**
 * Resolves the MetaMask Pay metadata behind an activity row. Provider-backed
 * rows (Perps, Predict) come from a remote feed carrying no `metamaskPay`, so
 * theirs is found via the local transaction behind the row's hash.
 *
 * @param item - Row to resolve.
 * @returns The Pay metadata, or `undefined` when Pay didn't route the row.
 */
export function useActivityPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  const localPay = getLocalPayMetadata(item);
  const { hash, chainId } = item;

  const payByHash = useSelector((state: RootState) => {
    if (localPay) {
      return undefined;
    }
    // Scoped to the row's chain, since the selector matches on hash alone.
    const meta = selectTransactionMetadataByHash(state, hash);
    return meta && toEvmCaipChainId(meta.chainId) === chainId
      ? meta.metamaskPay
      : undefined;
  });

  return localPay ?? payByHash;
}
