import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from './controllers/transaction-controller-mock';

export const transferTransactionStateMock = merge(
  transactionApprovalControllerMock,
  simpleSendTransactionControllerMock,
);
