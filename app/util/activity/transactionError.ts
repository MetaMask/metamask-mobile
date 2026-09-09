import { TransactionMeta } from '@metamask/transaction-controller';

/**
 * The failure reason a transaction recorded, or `undefined` when it has none.
 *
 * The useful message is often buried in a JSON blob on the error stack
 * (`{ ..., data: { message } }`) behind a generic `error.message` wrapper, so
 * the stack wins whenever it parses — same reading as the confirmations
 * screen's `getErrorMessage`.
 */
export function getTransactionErrorMessage(
  transactionMeta: TransactionMeta,
): string | undefined {
  const { error } = transactionMeta;

  if (!error) return undefined;

  if (error.stack) {
    try {
      const start = error.stack.indexOf('{');
      const end = error.stack.lastIndexOf('}');
      const stackObject = JSON.parse(error.stack.substring(start, end + 1));
      const stackMessage = stackObject?.data?.message;

      if (stackMessage) {
        return stackMessage;
      }
    } catch {
      // Intentionally empty — fall back to `error.message`.
    }
  }

  return error.message;
}
