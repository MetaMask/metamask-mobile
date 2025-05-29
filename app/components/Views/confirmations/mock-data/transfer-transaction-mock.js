import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './approval-controller-mock';
import { simpleSendTransactionControllerMock } from './transaction-controller-mock';

export const transferTransactionStateMock = merge(
  transactionApprovalControllerMock,
  simpleSendTransactionControllerMock,
);
