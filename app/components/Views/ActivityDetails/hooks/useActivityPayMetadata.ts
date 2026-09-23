import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { useLocalTransactionMeta } from './useLocalTransactionMeta';

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
  const meta = useLocalTransactionMeta(item.hash);

  if (!meta || toEvmCaipChainId(meta.chainId) !== item.chainId) {
    return undefined;
  }

  return meta.metamaskPay;
}
