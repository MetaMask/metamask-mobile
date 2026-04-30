import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import type { TransactionMeta } from '@metamask/transaction-controller';

export type TransactionViewModel = V1TransactionByHashResponse & {
  // Intent is to use the API response more directly
  id: string;
  time: number;
  hexChainId: string;
  // But for now, we keep this until we can refactor the UI components
  transactionMeta: TransactionMeta;
};
