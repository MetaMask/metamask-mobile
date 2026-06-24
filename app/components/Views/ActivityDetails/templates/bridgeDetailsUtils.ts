import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { TokenAmount } from '../../../../util/activity-adapters';

export function getBridgeDestinationChainId(token: TokenAmount | undefined) {
  return token?.assetId?.split('/')[0];
}

export function getBridgeDestinationTxHash(
  bridgeHistoryItem: BridgeHistoryItem | undefined,
) {
  return bridgeHistoryItem?.status.destChain?.txHash;
}
