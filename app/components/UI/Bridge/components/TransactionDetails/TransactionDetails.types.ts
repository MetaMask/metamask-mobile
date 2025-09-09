import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';

export interface BridgeTransactionDetailsParams {
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}
