import type { Transaction } from '@metamask/keyring-api';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import {
  ACTIVITY_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../core/Analytics/events/transactions';
import { MonetizedPrimitive } from '../../../core/Analytics/MetaMetrics.types';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { isBridgeTxHistoryItemBridge } from '../../UI/Bridge/utils/transaction-history';

export const getMultichainTransactionDetailEventProperties = ({
  transaction,
  chainId,
  location,
  bridgeHistoryItem,
}: {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  location?: TransactionDetailLocation;
  bridgeHistoryItem?: BridgeHistoryItem;
}) => {
  const baseProperties = {
    transaction_type: transaction.type?.toLowerCase() ?? 'unknown',
    transaction_status: transaction.status ?? 'unknown',
    location: location ?? TransactionDetailLocation.Home,
    chain_id_source: String(chainId),
    chain_id_destination: String(chainId),
  };

  if (!bridgeHistoryItem) {
    return baseProperties;
  }

  const { quote } = bridgeHistoryItem;
  return {
    ...baseProperties,
    transaction_type: isBridgeTxHistoryItemBridge(bridgeHistoryItem)
      ? 'bridge'
      : 'swap',
    chain_id_source: formatChainIdToCaip(quote.srcChainId),
    chain_id_destination: formatChainIdToCaip(quote.destChainId),
    monetized_primitive: MonetizedPrimitive.Swaps,
  };
};

export { ACTIVITY_DETAIL_EVENTS };
