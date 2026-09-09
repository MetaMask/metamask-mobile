import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { MetamaskPayMetadata } from '@metamask/transaction-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import { useLocalTransactionMeta } from './useLocalTransactionMeta';

export function useActivityPayMetadata(
  item: ActivityListItem,
): MetamaskPayMetadata | undefined {
  const meta = useLocalTransactionMeta(item.hash);

  if (!meta || toEvmCaipChainId(meta.chainId) !== item.chainId) {
    return undefined;
  }

  return meta.metamaskPay;
}
