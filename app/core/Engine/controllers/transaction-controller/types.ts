import { JsonMap } from '../../../Analytics/MetaMetrics.types';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import type { RootState } from '../../../../reducers';
import { TransactionControllerInitMessenger } from '../../messengers/transaction-controller-messenger';

// In order to not import from redux slice, type is defined here
export interface TransactionMetrics {
  properties: JsonMap;
  sensitiveProperties: JsonMap;
}

export interface TransactionEventHandlerRequest {
  getState: () => RootState;
  initMessenger: TransactionControllerInitMessenger;
  smartTransactionsController: SmartTransactionsController;
}
