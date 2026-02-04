import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../../../UI/Earn/constants/musd';
import { hasTransactionType } from '../../../utils/transaction';

/**
 * Find the send transaction (swap/transfer of source stablecoin) from a list of transactions.
 * This is the transaction that is NOT an approval and NOT the mUSD receive.
 */
export function findMusdSendTransaction(
  transactions: TransactionMeta[],
  chainId: Hex,
): TransactionMeta | undefined {
  const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId]?.toLowerCase();

  return transactions.find((tx) => {
    // Exclude approvals
    if (
      hasTransactionType(tx, [
        TransactionType.tokenMethodApprove,
        TransactionType.swapApproval,
        TransactionType.bridgeApproval,
      ])
    ) {
      return false;
    }

    // Exclude mUSD receive transactions
    if (
      musdAddress &&
      tx.transferInformation?.contractAddress?.toLowerCase() === musdAddress
    ) {
      return false;
    }

    // This should be the swap/send transaction
    return true;
  });
}
