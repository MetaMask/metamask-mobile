import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { SmartTransaction } from '@metamask/smart-transactions-controller';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction as NonEvmTransaction } from '@metamask/keyring-api';

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

export enum TransactionKind {
  Evm = 'evm',
  ConfirmedEvm = 'confirmed',
  NonEvm = 'nonEvm',
}

export type UnifiedItem =
  | { kind: TransactionKind.Evm; tx: EvmTransaction; time: number }
  | {
      kind: TransactionKind.ConfirmedEvm;
      tx: TransactionViewModel;
      time: number;
    }
  | { kind: TransactionKind.NonEvm; tx: NonEvmTransaction; time: number };
