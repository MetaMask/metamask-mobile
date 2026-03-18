import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';
import { SmartTransactionsController } from '@metamask/smart-transactions-controller';
import type { RootState } from '../../../../reducers';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';
import { TransactionMeta } from '@metamask/transaction-controller';

export interface TransactionMetrics {
  properties: JsonMap;
  sensitiveProperties: JsonMap;
}

export interface TransactionEventHandlerRequest {
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
  smartTransactionsController: SmartTransactionsController;
}

export interface TransactionMetricsBuilderRequest {
  eventType: IMetaMetricsEvent;
  transactionMeta: TransactionMeta;
  allTransactions: TransactionMeta[];
  getUIMetrics: (transactionId: string) => TransactionMetrics;
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
  smartTransactionsController: SmartTransactionsController;
}

export type TransactionMetricsBuilder = (
  request: TransactionMetricsBuilderRequest,
) => TransactionMetrics | Promise<TransactionMetrics>;
