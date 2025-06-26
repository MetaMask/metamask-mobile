import { merge } from 'lodash';

import { transactionApprovalControllerMock } from './controllers/approval-controller-mock';
import { emptySignatureControllerMock } from './controllers/signature-controller-mock';
import { otherControllersMock } from './controllers/other-controllers-mock';
import { gasFeeControllerMock } from './controllers/gas-fee-controller-mock';

import {
  approveERC20TransactionControllerMock,
  revokeERC20TransactionControllerMock,
  approveERC721TransactionControllerMock,
  revokeERC721TransactionControllerMock,
  decreaseAllowanceERC20TransactionControllerMock,
  increaseAllowanceERC20TransactionControllerMock,
  approveAllERC721TransactionControllerMock,
  revokeAllERC721TransactionControllerMock,
  approveERC20Permit2TransactionControllerMock,
  revokeERC20Permit2TransactionControllerMock,
} from './controllers/transaction-controller-mock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createTransactionStateMock = (transactionControllerMock: any) =>
  merge(
    {},
    transactionControllerMock,
    emptySignatureControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
    gasFeeControllerMock,
  );

export const approveERC20TransactionStateMock = createTransactionStateMock(
  approveERC20TransactionControllerMock,
);

export const revokeERC20TransactionStateMock = createTransactionStateMock(
  revokeERC20TransactionControllerMock,
);

export const approveERC721TransactionStateMock = createTransactionStateMock(
  approveERC721TransactionControllerMock,
);

export const revokeERC721TransactionStateMock = createTransactionStateMock(
  revokeERC721TransactionControllerMock,
);

export const decreaseAllowanceERC20TransactionStateMock =
  createTransactionStateMock(decreaseAllowanceERC20TransactionControllerMock);

export const increaseAllowanceERC20TransactionStateMock =
  createTransactionStateMock(increaseAllowanceERC20TransactionControllerMock);

export const approveAllERC721TransactionStateMock = createTransactionStateMock(
  approveAllERC721TransactionControllerMock,
);

export const revokeAllERC721TransactionStateMock = createTransactionStateMock(
  revokeAllERC721TransactionControllerMock,
);

export const approveERC20Permit2TransactionStateMock =
  createTransactionStateMock(approveERC20Permit2TransactionControllerMock);

export const revokeERC20Permit2TransactionStateMock =
  createTransactionStateMock(revokeERC20Permit2TransactionControllerMock);
