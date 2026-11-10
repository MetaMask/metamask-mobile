import { TransactionType } from '@metamask/transaction-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';

/**
 * Deposit prewarming inserts a real `perpsDepositAndOrder` before the user taps
 * Long or Short. Transaction Added and Transaction Rejected would otherwise
 * count a market view as a started-and-abandoned deposit.
 *
 * Creations started with {@link beginUnclaimedPrewarmTransaction} are held
 * back. {@link trackStashedPrewarmTransactionAdded} emits Added once the user
 * claims one. Rejecting an id that is still held back emits nothing.
 *
 * Each begin returns a generation. Blur, refocus, and account or provider
 * changes start a new prewarm while the previous `depositWithOrder` is still
 * in flight, and both share this module. Settlement only touches ids that
 * generation held, so a discarded prewarm cannot emit or wipe the next one.
 */

interface PrewarmTransactionIdentity {
  id?: string;
  type?: string;
}

let nextGeneration = 1;
let emittingStashed = false;
const activeGenerations = new Set<number>();
const unclaimedIds = new Set<string>();
const stashedAdded = new Map<string, () => void | Promise<void>>();
const ownersById = new Map<string, Set<number>>();

/**
 * Marks the next in-flight `perpsDepositAndOrder` insert as an unclaimed prewarm.
 *
 * @returns Generation token. Pass it to the matching end and settlement calls.
 */
export function beginUnclaimedPrewarmTransaction(): number {
  const generation = nextGeneration;
  nextGeneration += 1;
  activeGenerations.add(generation);
  return generation;
}

/**
 * Pairs with {@link beginUnclaimedPrewarmTransaction} once that creation settles.
 * Closes the suppression window. It does not emit or drop a held-back insert.
 */
export function endUnclaimedPrewarmTransaction(generation: number): void {
  activeGenerations.delete(generation);
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
    activeGenerations.size === 0 ||
    transaction.type !== TransactionType.perpsDepositAndOrder ||
    !transaction.id
  ) {
    return false;
  }
  unclaimedIds.add(transaction.id);
  ownersById.set(transaction.id, new Set(activeGenerations));
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
 * The prewarm's own id is `transactionId`. Any other insert this generation
 * held alone was a real transaction and is emitted now. An insert that a
 * newer in-flight prewarm also holds stays stashed.
 */
export function retainOnlyUnclaimedPrewarmTransaction(
  generation: number,
  transactionId: string,
): void {
  settleGeneration(generation, transactionId, 'release');
}

/**
 * Emits every insert this generation held alone. Used when prewarm creation
 * itself fails before a transaction exists. A newer in-flight prewarm keeps
 * its own stash.
 */
export function releaseAllStashedPrewarmTransactionAdded(
  generation: number,
): void {
  settleGeneration(generation, undefined, 'release');
}

/** Drops held-back metrics for one id without emitting. */
export function dropUnclaimedPrewarmTransaction(transactionId: string): void {
  forget(transactionId);
}

/**
 * Drops inserts this generation held alone, without emitting. The transaction
 * is being rejected. A newer in-flight prewarm keeps its own stash.
 */
export function dropAllUnclaimedPrewarmTransactions(generation: number): void {
  settleGeneration(generation, undefined, 'drop');
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
  forget(transactionId);
  if (emit) {
    await emitHeldBack(emit);
  }
}

/**
 * Applies `action` to inserts owned by `generation` and by no prewarm that is
 * still in flight. `keepTransactionId` stays held with no owner, so a later
 * generation cannot emit the transaction this one prepared.
 */
function settleGeneration(
  generation: number,
  keepTransactionId: string | undefined,
  action: 'release' | 'drop',
): void {
  const ids = new Set<string>([...stashedAdded.keys(), ...ownersById.keys()]);
  for (const id of ids) {
    const owners = ownersById.get(id);
    if (!owners?.has(generation)) {
      continue;
    }
    if (id === keepTransactionId) {
      ownersById.delete(id);
      continue;
    }
    owners.delete(generation);
    const stillHeld = [...owners].some((owner) => activeGenerations.has(owner));
    if (owners.size === 0) {
      ownersById.delete(id);
    }
    if (stillHeld) {
      continue;
    }
    const emit = stashedAdded.get(id);
    forget(id);
    if (action === 'release' && emit) {
      // eslint-disable-next-line no-void -- held-back metrics must not block settlement
      void emitHeldBack(emit);
    }
  }
}

function forget(transactionId: string): void {
  unclaimedIds.delete(transactionId);
  stashedAdded.delete(transactionId);
  ownersById.delete(transactionId);
}

function emitHeldBack(emit: () => void | Promise<void>): Promise<void> {
  emittingStashed = true;
  let result: void | Promise<void>;
  try {
    result = emit();
  } catch (error) {
    emittingStashed = false;
    logHeldBackEmitFailure(error);
    return Promise.resolve();
  }
  return Promise.resolve(result)
    .catch((error: unknown) => {
      logHeldBackEmitFailure(error);
    })
    .finally(() => {
      emittingStashed = false;
    });
}

function logHeldBackEmitFailure(error: unknown): void {
  DevLogger.log(
    '[unclaimedPrewarmTransactionMetrics] Failed to emit held-back Transaction Added',
    error,
  );
}

/** Test-only. */
export function resetUnclaimedPrewarmTransactionMetricsForTesting(): void {
  nextGeneration = 1;
  emittingStashed = false;
  activeGenerations.clear();
  unclaimedIds.clear();
  stashedAdded.clear();
  ownersById.clear();
}
