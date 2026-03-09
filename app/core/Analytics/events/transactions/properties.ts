import { TransactionStatus } from '@metamask/transaction-controller';

import type { JsonMap, MonetizedPrimitive } from '../../MetaMetrics.types';
import { TransactionDetailLocation } from './constants';

/**
 * Properties for the "Transaction Detail List Item Clicked" event.
 *
 * @property transaction_type - TX type value from getTransactionTypeValue()
 * (e.g. 'simple_send', 'swap', 'bridge', 'contract_interaction').
 * @property transaction_status - Status from TransactionStatus enum
 * (e.g. 'confirmed', 'submitted', 'failed').
 * @property location - Where the user clicked (home or asset_details).
 * @property chain_id_source - Source chain ID.
 * @property chain_id_destination - Destination chain ID.
 * Same as chain_id_source for single-chain transactions.
 * @property monetized_primitive - Only propagated when the transaction
 * involves a monetized primitive.
 */
export interface TransactionDetailListItemClickedProperties extends JsonMap {
  transaction_type: string;
  transaction_status: TransactionStatus;
  location: TransactionDetailLocation;
  chain_id_source: string;
  chain_id_destination: string;
  monetized_primitive?: MonetizedPrimitive;
}
