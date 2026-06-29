import type { Transaction } from '@metamask/keyring-api';
import type { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import {
  TRANSACTION_DETAIL_EVENTS,
  TransactionDetailLocation,
} from '../../../core/Analytics/events/transactions';
import { mapKeyringTransaction } from '../../../util/activity-adapters';

export const mapMultichainTransactionToActivityItem = ({
  transaction,
  chainId,
}: {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
}) =>
  mapKeyringTransaction({
    transaction: {
      ...transaction,
      chain: transaction.chain ?? chainId,
    },
  });

export const getMultichainTransactionDetailEventProperties = ({
  transaction,
  chainId,
  location,
}: {
  transaction: Transaction;
  chainId: SupportedCaipChainId;
  location?: TransactionDetailLocation;
}) => ({
  transaction_type: transaction.type?.toLowerCase() ?? 'unknown',
  transaction_status: transaction.status ?? 'unknown',
  location: location ?? TransactionDetailLocation.Home,
  chain_id_source: String(chainId),
  chain_id_destination: String(chainId),
});

export { TRANSACTION_DETAIL_EVENTS };
