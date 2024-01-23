import {
  SecurityAlertResponse,
  Transaction,
  WalletDevice,
} from '@metamask/transaction-controller';

import Engine from '../../core/Engine';

export async function addTransaction(
  transaction: Transaction,
  opts: {
    deviceConfirmedOn?: WalletDevice;
    origin?: string;
    securityAlertResponse?: SecurityAlertResponse;
  },
) {
  const { TransactionController } = Engine.context;

  return await TransactionController.addTransaction(transaction, opts);
}

export async function estimateGas(transaction: Transaction) {
  const { TransactionController } = Engine.context;

  return await TransactionController.estimateGas(transaction);
}
