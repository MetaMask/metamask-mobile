import { useSelector } from 'react-redux';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { RootState } from '../../../../reducers';
import { selectTransactionMetadataByHash } from '../../../../selectors/transactionController';
import type { ActivityListItem } from '../../../../util/activity-adapters';

/** MetaMask Pay metadata carried by the row's own local transaction. */
function getLocalPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  return item.raw?.type === 'localTransaction'
    ? item.raw.data.primaryTransaction?.metamaskPay
    : undefined;
}

/**
 * The MetaMask Pay metadata behind an activity row, or `undefined` when Pay
 * didn't route it.
 *
 * Provider-backed rows (Perps, Predict) come from a remote feed and carry no
 * `metamaskPay` of their own, so theirs is resolved from the local transaction
 * behind the row's hash.
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
