import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './controllers/approval-controller-mock';
import { approveERC20TransactionControllerMock } from './controllers/transaction-controller-mock';
import { emptySignatureControllerMock } from './controllers/signature-controller-mock';
import { otherControllersMock } from './controllers/other-controllers-mock';
import { gasFeeControllerMock } from './controllers/gas-fee-controller-mock';

export const approveERC20TransactionStateMock = merge(
  {},
  emptySignatureControllerMock,
  approveERC20TransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
  gasFeeControllerMock,
);
