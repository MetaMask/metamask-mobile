import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../../constants/bridge';
import { strings } from '../../../../../locales/i18n';

export const getBridgeTxActivityTitle = (bridgeTxHistoryItem: BridgeHistoryItem) => {
  const destChainId = isSolanaChainId(bridgeTxHistoryItem.quote.destChainId)
    ? formatChainIdToCaip(bridgeTxHistoryItem.quote.destChainId)
    : formatChainIdToHex(bridgeTxHistoryItem.quote.destChainId);
  const destChainName = NETWORK_TO_SHORT_NETWORK_NAME_MAP[destChainId];
  return destChainName
    ? strings('bridge_transaction_details.bridge_to_chain', {
        chainName: destChainName,
      })
    : undefined;
};
