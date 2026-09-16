import {
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';

import Engine from '../../../../core/Engine';

function getTransactionControllerState() {
  return Engine.controllerMessenger.call('TransactionController:getState');
}

export function getRequiredTransactionIds(transactionId: string): string[] {
  return (
    getTransactionControllerState().transactions.find(
      (transaction) => transaction.id === transactionId,
    )?.requiredTransactionIds ?? []
  );
}

/**
 * Pay submits one quote at a time, so legs of later quotes only appear in
 * `requiredTransactionIds` after earlier ones confirm.
 */
function getExpectedQuoteCount(transactionId: string): number {
  return (
    Engine.controllerMessenger.call('TransactionPayController:getState')
      .transactionData[transactionId]?.quotes?.length ?? 1
  );
}

export function isTransactionStatusSignedOrLater(
  status: TransactionStatus | undefined,
): boolean {
  return (
    status === TransactionStatus.signed ||
    status === TransactionStatus.submitted ||
    status === TransactionStatus.confirmed
  );
}

/**
 * Each quote adds either one plain transaction or one batch. Signing is done
 * once every expected quote has all of its legs present and signed.
 */
export function haveRequiredTransactionsBeenSigned(
  transactionId: string,
): boolean {
  const { batchTransactionCounts, transactions } =
    getTransactionControllerState();
  const requiredTransactions = getRequiredTransactionIds(transactionId).map(
    (id) => transactions.find((transaction) => transaction.id === id),
  );

  if (requiredTransactions.some((transaction) => !transaction)) {
    return false;
  }

  const legsByGroup = new Map<string, TransactionMeta[]>();
  for (const transaction of requiredTransactions as TransactionMeta[]) {
    const group = transaction.batchId ?? transaction.id;
    legsByGroup.set(group, [...(legsByGroup.get(group) ?? []), transaction]);
  }

  if (legsByGroup.size < getExpectedQuoteCount(transactionId)) {
    return false;
  }

  return [...legsByGroup.entries()].every(([group, legs]) => {
    const expectedLegs = batchTransactionCounts[group] ?? legs.length;
    return (
      legs.length >= expectedLegs &&
      legs.every((leg) => isTransactionStatusSignedOrLater(leg.status))
    );
  });
}
