import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { TransactionMeta } from '@metamask/transaction-controller';

export type ConfirmedEvmTransaction = V1TransactionByHashResponse & {
  id: string;
  time: number;
  txChainId: string;
  transactionMeta: TransactionMeta;
};
