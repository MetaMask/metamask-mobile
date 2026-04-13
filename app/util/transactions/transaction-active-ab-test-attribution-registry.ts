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

/** Oldest entries are dropped when this count would be exceeded (FIFO). */
const MAX_ATTRIBUTION_BY_TRANSACTION_ID_ENTRIES = 200;

let pendingTransactionActiveAbTests: TransactionActiveAbTestEntry[] | undefined;

const pendingStashStack: (TransactionActiveAbTestEntry[] | undefined)[] = [];

const attributionByTransactionId = new Map<
  string,
  TransactionActiveAbTestEntry[]
>();

function popPendingStashLayer(): void {
  pendingTransactionActiveAbTests = pendingStashStack.pop() ?? undefined;
}

function pushPendingStashLayer(
  tests: TransactionActiveAbTestEntry[] | undefined,
): void {
  pendingStashStack.push(pendingTransactionActiveAbTests);
  pendingTransactionActiveAbTests =
    tests?.length && tests.length > 0 ? tests : undefined;
}

function evictOldestAttributionEntries(countToAdd: number): void {
  while (
    attributionByTransactionId.size + countToAdd >
    MAX_ATTRIBUTION_BY_TRANSACTION_ID_ENTRIES
  ) {
    const oldest = attributionByTransactionId.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    attributionByTransactionId.delete(oldest);
  }
}

/**
 * Stash assignments that should be applied to the next transaction(s) added
 * via TransactionController. Pushes the previous stash so nested
 * {@link withPendingTransactionActiveAbTests} calls restore the outer layer.
 */
export function stashPendingTransactionActiveAbTests(
  tests: TransactionActiveAbTestEntry[] | undefined,
): void {
  pushPendingStashLayer(tests);
}

export function getPendingTransactionActiveAbTests():
  | TransactionActiveAbTestEntry[]
  | undefined {
  return pendingTransactionActiveAbTests;
}

/**
 * Clears all pending layers (test / emergency reset). Prefer
 * {@link withPendingTransactionActiveAbTests} in product code so layers stay balanced.
 */
export function clearPendingTransactionActiveAbTests(): void {
  pendingStashStack.length = 0;
  pendingTransactionActiveAbTests = undefined;
}

/**
 * Sets pending attribution for the duration of `fn` (until the returned promise
 * settles), then restores the previous stash layer.
 *
 * Nested calls stack correctly. Overlapping top-level async flows that both
 * await before `addTransaction` can still race on the single pending slot; in
 * practice those flows rarely run in parallel.
 */
export async function withPendingTransactionActiveAbTests<T>(
  tests: TransactionActiveAbTestEntry[] | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  pushPendingStashLayer(tests);
  try {
    return await fn();
  } finally {
    popPendingStashLayer();
  }
}

export function registerTransactionAbTestAttributionForIds(
  transactionIds: string[],
  tests: TransactionActiveAbTestEntry[] | undefined,
): void {
  if (!tests?.length) {
    return;
  }
  const ids = transactionIds.filter(Boolean);
  if (ids.length === 0) {
    return;
  }
  evictOldestAttributionEntries(ids.length);
  for (const id of ids) {
    attributionByTransactionId.set(id, tests);
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
