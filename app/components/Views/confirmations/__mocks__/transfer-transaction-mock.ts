import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from './controllers/transaction-controller-mock';
import { otherControllersMock } from './controllers/other-controllers-mock';
import { emptySignatureControllerMock } from './controllers/signature-controller-mock';

export const transferTransactionStateMock = merge(
  transactionApprovalControllerMock,
  simpleSendTransactionControllerMock,
  emptySignatureControllerMock,
  otherControllersMock,
);
