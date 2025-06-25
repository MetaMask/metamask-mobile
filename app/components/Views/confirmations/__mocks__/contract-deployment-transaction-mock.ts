import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './controllers/approval-controller-mock';
import { erc20ContractDeploymentTransactionControllerMock } from './controllers/transaction-controller-mock';
import { emptySignatureControllerMock } from './controllers/signature-controller-mock';
import { otherControllersMock } from './controllers/other-controllers-mock';
import { gasFeeControllerMock } from './controllers/gas-fee-controller-mock';

export const contractDeploymentTransactionStateMock = merge(
  {},
  emptySignatureControllerMock,
  erc20ContractDeploymentTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
  gasFeeControllerMock,
);
