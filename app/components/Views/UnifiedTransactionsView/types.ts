import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';

export type SmartTransactionWithId = SmartTransaction & { id: string };

export type EvmTransaction = TransactionMeta | SmartTransactionWithId;

export type TransactionViewModel = V1TransactionByHashResponse & {
  // Intent is to use the API response more directly
  id: string;
  time: number;
  hexChainId: string;
  // But for now, we keep this until we can refactor the UI components
  transactionMeta: TransactionMeta;
};
