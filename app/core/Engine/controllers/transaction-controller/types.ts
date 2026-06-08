import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../../util/analytics/analytics.types';
import type { SmartTransaction } from '@metamask/smart-transactions-controller';
import type { RootState } from '../../../../reducers';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import { TransactionMeta } from '@metamask/transaction-controller';

export interface TransactionMetrics {
  properties: JsonMap;
  sensitiveProperties: JsonMap;
}

export interface TransactionEventHandlerRequest {
  getSmartTransactionByMinedTxHash: (
    txHash: string | undefined,
  ) => SmartTransaction | undefined;
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
}

export interface TransactionMetricsBuilderRequest {
  eventType: IMetaMetricsEvent;
  transactionMeta: TransactionMeta;
  allTransactions: TransactionMeta[];
  getSmartTransactionByMinedTxHash: (
    txHash: string | undefined,
  ) => SmartTransaction | undefined;
  getUIMetrics: (transactionId: string) => TransactionMetrics;
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
}

export type TransactionMetricsBuilder = (
  request: TransactionMetricsBuilderRequest,
) => TransactionMetrics | Promise<TransactionMetrics>;
