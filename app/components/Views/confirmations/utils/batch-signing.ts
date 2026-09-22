import {
  TransactionStatus,
  type TransactionControllerState,
  type TransactionMeta,
} from '@metamask/transaction-controller';

/** Slice of controller state needed to judge batch signing progress. */
export type BatchSigningState = Pick<
  TransactionControllerState,
  'transactions' | 'batchTransactionCounts'
>;

export function getRequiredTransactionIds(
  transactionId: string,
  transactions: TransactionMeta[],
): string[] {
  return (
    transactions.find((transaction) => transaction.id === transactionId)
      ?.requiredTransactionIds ?? []
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
 *
 * Pay submits one quote at a time, so legs of later quotes only appear in
 * `requiredTransactionIds` after earlier ones confirm; `expectedQuoteCount`
 * keeps the check from completing early on the first quote.
 */
export function haveRequiredTransactionsBeenSigned(
  transactionId: string,
  { batchTransactionCounts, transactions }: BatchSigningState,
  expectedQuoteCount = 1,
): boolean {
  const requiredTransactions = getRequiredTransactionIds(
    transactionId,
    transactions,
  ).map((id) => transactions.find((transaction) => transaction.id === id));

  // No legs yet means nothing has been signed, whatever the quote count says.
  if (
    requiredTransactions.length === 0 ||
    requiredTransactions.some((transaction) => !transaction)
  ) {
    return false;
  }

  const legsByGroup = new Map<string, TransactionMeta[]>();
  for (const transaction of requiredTransactions as TransactionMeta[]) {
    const group = transaction.batchId ?? transaction.id;
    legsByGroup.set(group, [...(legsByGroup.get(group) ?? []), transaction]);
  }

  if (legsByGroup.size < expectedQuoteCount) {
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
