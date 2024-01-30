import {
  Transaction,
  TransactionController as BaseTransactionController,
} from '@metamask/transaction-controller';

import Engine from '../../core/Engine';

// Keeping this export as function to put more logic in the future
export async function addTransaction(
  transaction: Transaction,
  opts: Parameters<BaseTransactionController['addTransaction']>[1],
) {
  const { TransactionController } = Engine.context;

  return await TransactionController.addTransaction(transaction, opts);
}

// Keeping this export as function to put more logic in the future
export async function estimateGas(transaction: Transaction) {
  const { TransactionController } = Engine.context;

  return await TransactionController.estimateGas(transaction);
}

export const cancelTransaction =
  Engine.context.TransactionController.cancelTransaction;
export const getNonceLock = Engine.context.TransactionController.getNonceLock;
export const speedUpTransaction =
  Engine.context.TransactionController.speedUpTransaction;
export const startIncomingTransactionPolling =
  Engine.context.TransactionController.startIncomingTransactionPolling;
export const stopIncomingTransactionPolling =
  Engine.context.TransactionController.stopIncomingTransactionPolling;
export const stopTransaction =
  Engine.context.TransactionController.stopTransaction;
export const updateIncomingTransactions =
  Engine.context.TransactionController.updateIncomingTransactions;
export const updateSecurityAlertResponse =
  Engine.context.TransactionController.updateSecurityAlertResponse;
export const updateTransaction =
  Engine.context.TransactionController.updateTransaction;
export const wipeTransactions =
  Engine.context.TransactionController.wipeTransactions;
