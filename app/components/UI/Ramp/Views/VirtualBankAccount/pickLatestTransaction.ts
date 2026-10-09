const TERMINAL_TRANSACTION_STATUSES = new Set([
  'Completed',
  'Failed',
  'Cancelled',
]);

export interface AutorampTransactionSummary {
  id: string;
  status: string;
  sourceAmount?: string;
  createdAt?: string;
}

/**
 * Prefer the newest transaction by `createdAt`. Without timestamps, prefer an
 * in-flight deposit over a terminal one so an older Completed/Failed row cannot
 * hide a newer payment.
 *
 * @param transactions - Autoramp transactions from NeoBank.
 * @returns The transaction to show, or undefined when the list is empty.
 */
export const pickLatestTransaction = (
  transactions: AutorampTransactionSummary[],
): AutorampTransactionSummary | undefined => {
  if (transactions.length === 0) {
    return undefined;
  }

  const dated = transactions.filter(
    (transaction) =>
      typeof transaction.createdAt === 'string' &&
      !Number.isNaN(Date.parse(transaction.createdAt)),
  );
  if (dated.length > 0) {
    return [...dated].sort(
      (left, right) =>
        Date.parse(right.createdAt as string) -
        Date.parse(left.createdAt as string),
    )[0];
  }

  const inFlight = transactions.find(
    (transaction) => !TERMINAL_TRANSACTION_STATUSES.has(transaction.status),
  );
  if (inFlight) {
    return inFlight;
  }

  return transactions[transactions.length - 1];
};
