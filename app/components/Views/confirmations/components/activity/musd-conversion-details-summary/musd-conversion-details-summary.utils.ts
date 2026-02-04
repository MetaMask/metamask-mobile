import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../../../UI/Earn/constants/musd';
import { hasTransactionType } from '../../../utils/transaction';

/**
 * Find the send transaction (relay deposit) from a list of transactions.
 */
export function findMusdSendTransaction(
  transactions: TransactionMeta[],
): TransactionMeta | undefined {
  return transactions.find((tx) =>
    hasTransactionType(tx, [TransactionType.relayDeposit]),
  );
}

/**
 * Find the receive transaction (mUSD token receive) from a list of transactions.
 * This is the transaction where transferInformation.contractAddress matches the mUSD token address.
 */
export function findMusdReceiveTransaction(
  transactions: TransactionMeta[],
  chainId: Hex,
): TransactionMeta | undefined {
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId]?.toLowerCase();
  if (!musdAddress) return undefined;

  return transactions.find(
    (tx) =>
      tx.transferInformation?.contractAddress?.toLowerCase() === musdAddress,
  );
}
