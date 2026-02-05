import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../../../UI/Earn/constants/musd';

/**
 * Find the mUSD receive transaction from a list of transactions.
 * Identified by transferInformation.contractAddress matching the mUSD token address.
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

/**
 * Get the mUSD receive hash, with fallback to transaction hash if valid.
 * Returns undefined if hash is '0x0' (pending/unknown).
 */
export function getMusdReceiveHash(
  musdReceiveTx: TransactionMeta | undefined,
  transaction: TransactionMeta,
): Hex | undefined {
  if (musdReceiveTx?.hash) {
    return musdReceiveTx.hash as Hex;
  }

  if (transaction.hash && transaction.hash !== '0x0') {
    return transaction.hash as Hex;
  }

  return undefined;
}
