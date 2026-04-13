/**
 * Binds `active_ab_tests` payloads to specific transaction IDs when those
 * transactions are created, so Transaction Added metrics are not driven by
 * global Redux state that can go stale across sessions.
 *
 * Used for swap, bridge, perps, predict, and any other flow that reports the
 * same `active_ab_tests` shape (e.g. homepage trending-sections experiment).
 */

export interface TransactionActiveAbTestEntry {
  key: string;
  value: string;
}

let pendingTransactionActiveAbTests: TransactionActiveAbTestEntry[] | undefined;

const attributionByTransactionId = new Map<
  string,
  TransactionActiveAbTestEntry[]
>();

/**
 * Stash assignments that should be applied to the next transaction(s) added
 * via TransactionController (until {@link clearPendingTransactionActiveAbTests}).
 */
export function stashPendingTransactionActiveAbTests(
  tests: TransactionActiveAbTestEntry[] | undefined,
): void {
  pendingTransactionActiveAbTests =
    tests?.length && tests.length > 0 ? tests : undefined;
}

export function getPendingTransactionActiveAbTests():
  | TransactionActiveAbTestEntry[]
  | undefined {
  return pendingTransactionActiveAbTests;
}

export function clearPendingTransactionActiveAbTests(): void {
  pendingTransactionActiveAbTests = undefined;
}

/**
 * Sets pending attribution for the duration of `fn` (until the returned promise
 * settles), then clears it. Prefer this over manual
 * {@link stashPendingTransactionActiveAbTests} / {@link clearPendingTransactionActiveAbTests}
 * so cleanup stays tied to the async boundary that creates transactions.
 */
export async function withPendingTransactionActiveAbTests<T>(
  tests: TransactionActiveAbTestEntry[] | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  stashPendingTransactionActiveAbTests(tests);
  try {
    return await fn();
  } finally {
    clearPendingTransactionActiveAbTests();
  }
}

export function registerTransactionAbTestAttributionForIds(
  transactionIds: string[],
  tests: TransactionActiveAbTestEntry[] | undefined,
): void {
  if (!tests?.length) {
    return;
  }
  for (const id of transactionIds) {
    if (id) {
      attributionByTransactionId.set(id, tests);
    }
  }
}

/**
 * Registers attribution for any pending stashed tests onto the given
 * transaction IDs, then leaves the stash unchanged (caller clears stash).
 */
export function registerPendingTransactionActiveAbTestsForTransactionIds(
  transactionIds: string[],
): void {
  const pending = pendingTransactionActiveAbTests;
  registerTransactionAbTestAttributionForIds(transactionIds, pending);
}

export function takeTransactionAbTestAttributionForTransaction(
  transactionId: string,
): TransactionActiveAbTestEntry[] | undefined {
  const tests = attributionByTransactionId.get(transactionId);
  if (tests) {
    attributionByTransactionId.delete(transactionId);
  }
  return tests;
}
