import { TransactionType } from '@metamask/transaction-controller';

/**
 * Deposit prewarming inserts a real `perpsDepositAndOrder` before the user taps
 * Long or Short. Transaction Added and Transaction Rejected would otherwise
 * count a market view as a started-and-abandoned deposit.
 *
 * Creations started with {@link beginUnclaimedPrewarmTransaction} are held
 * back. {@link trackStashedPrewarmTransactionAdded} emits Added once the user
 * claims one. Rejecting an id that is still held back emits nothing.
 */

interface PrewarmTransactionIdentity {
  id?: string;
  type?: string;
}

let creationsInFlight = 0;
let emittingStashed = false;
const unclaimedIds = new Set<string>();
const stashedAdded = new Map<string, () => void | Promise<void>>();

/** Marks the next in-flight `perpsDepositAndOrder` insert as an unclaimed prewarm. */
export function beginUnclaimedPrewarmTransaction(): void {
  creationsInFlight += 1;
}

/** Pairs with {@link beginUnclaimedPrewarmTransaction} once that creation settles. */
export function endUnclaimedPrewarmTransaction(): void {
  creationsInFlight = Math.max(0, creationsInFlight - 1);
}

/**
 * Whether Transaction Added for this insert must wait until the user claims it.
 * Other transaction types added during the same window are not held back.
 */
export function suppressUnclaimedPrewarmTransactionAdded(
  transaction: PrewarmTransactionIdentity,
): boolean {
  if (
    emittingStashed ||
    creationsInFlight === 0 ||
    transaction.type !== TransactionType.perpsDepositAndOrder ||
    !transaction.id
  ) {
    return false;
  }
  unclaimedIds.add(transaction.id);
  return true;
}

/** Keeps the Transaction Added emit until claim, reject, or an explicit release. */
export function stashUnclaimedPrewarmTransactionAdded(
  transactionId: string,
  emit: () => void | Promise<void>,
): void {
  stashedAdded.set(transactionId, emit);
}

/**
 * The prewarm's own id is `transactionId`. Any other insert held back during
 * the same window was a real transaction and is emitted now.
 */
export function retainOnlyUnclaimedPrewarmTransaction(
  transactionId: string,
): void {
  for (const [id, emit] of [...stashedAdded]) {
    if (id === transactionId) {
      continue;
    }
    stashedAdded.delete(id);
    unclaimedIds.delete(id);
    emitHeldBack(emit);
  }
}

/** Emits every held-back Transaction Added. Used when prewarm creation itself fails. */
export function releaseAllStashedPrewarmTransactionAdded(): void {
  const pending = [...stashedAdded];
  stashedAdded.clear();
  for (const [id, emit] of pending) {
    unclaimedIds.delete(id);
    emitHeldBack(emit);
  }
}

/** Drops held-back metrics without emitting. The transaction is being rejected. */
export function dropUnclaimedPrewarmTransaction(transactionId: string): void {
  unclaimedIds.delete(transactionId);
  stashedAdded.delete(transactionId);
}

/** Drops every held-back prewarm without emitting. */
export function dropAllUnclaimedPrewarmTransactions(): void {
  unclaimedIds.clear();
  stashedAdded.clear();
}

/** Whether Transaction Rejected for this id belongs to a prewarm the user never claimed. */
export function isUnclaimedPrewarmTransaction(transactionId: string): boolean {
  return unclaimedIds.has(transactionId);
}

/**
 * The user claimed this prewarm. Emits its Transaction Added, and a later
 * rejection is counted as theirs.
 */
export async function trackStashedPrewarmTransactionAdded(
  transactionId: string,
): Promise<void> {
  const emit = stashedAdded.get(transactionId);
  stashedAdded.delete(transactionId);
  unclaimedIds.delete(transactionId);
  if (emit) {
    await emitHeldBack(emit);
  }
}

function emitHeldBack(emit: () => void | Promise<void>): Promise<void> {
  emittingStashed = true;
  try {
    return Promise.resolve(emit()).finally(() => {
      emittingStashed = false;
    });
  } catch (error) {
    emittingStashed = false;
    throw error;
  }
}

/** Test-only. */
export function resetUnclaimedPrewarmTransactionMetricsForTesting(): void {
  creationsInFlight = 0;
  emittingStashed = false;
  unclaimedIds.clear();
  stashedAdded.clear();
}
