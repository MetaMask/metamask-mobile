import {
  TransactionParams,
  TransactionController as BaseTransactionController,
} from '@metamask/transaction-controller';

import Engine from '../../core/Engine';

// Keeping this export as function to put more logic in the future
export async function addTransaction(
  transaction: TransactionParams,
  opts: Parameters<BaseTransactionController['addTransaction']>[1],
) {
  const { TransactionController } = Engine.context;

  return await TransactionController.addTransaction(transaction, opts);
}

// Keeping this export as function to put more logic in the future
export async function estimateGas(transaction: TransactionParams) {
  const { TransactionController } = Engine.context;

  return await TransactionController.estimateGas(transaction);
}

// Proxy methods
export function handleMethodData(
  ...args: Parameters<BaseTransactionController['handleMethodData']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.handleMethodData(...args);
}

export function getNonceLock(
  ...args: Parameters<BaseTransactionController['getNonceLock']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.getNonceLock(...args);
}

export function speedUpTransaction(
  ...args: Parameters<BaseTransactionController['speedUpTransaction']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.speedUpTransaction(...args);
}

export function startIncomingTransactionPolling(
  ...args: Parameters<
    BaseTransactionController['startIncomingTransactionPolling']
  >
) {
  const { TransactionController } = Engine.context;
  return TransactionController.startIncomingTransactionPolling(...args);
}

export function stopIncomingTransactionPolling(
  ...args: Parameters<
    BaseTransactionController['stopIncomingTransactionPolling']
  >
) {
  const { TransactionController } = Engine.context;
  return TransactionController.stopIncomingTransactionPolling(...args);
}

export function updateIncomingTransactions(
  ...args: Parameters<BaseTransactionController['updateIncomingTransactions']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateIncomingTransactions(...args);
}

export function updateSecurityAlertResponse(
  ...args: Parameters<BaseTransactionController['updateSecurityAlertResponse']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateSecurityAlertResponse(...args);
}

export function updateTransaction(
  ...args: Parameters<BaseTransactionController['updateTransaction']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.updateTransaction(...args);
}

export function wipeTransactions(
  ...args: Parameters<BaseTransactionController['wipeTransactions']>
) {
  const { TransactionController } = Engine.context;
  return TransactionController.wipeTransactions(...args);
}
