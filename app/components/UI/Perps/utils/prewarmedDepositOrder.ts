import { TransactionStatus } from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

/**
 * The provider a deposit-with-order transaction is prepared against. Aggregated
 * mode has no deposit route of its own, so it falls back to the default
 * provider. Prewarm and consumption must agree on this or the prewarm is
 * rejected as belonging to another provider.
 *
 * @param activeProvider - `PerpsController.activeProvider`.
 * @returns The provider the deposit will be prepared for.
 */
export function resolveDepositOrderProvider(
  activeProvider: string | undefined,
): string {
  return activeProvider === undefined ||
    activeProvider === PROVIDER_CONFIG.AggregatedProvider
    ? PROVIDER_CONFIG.DefaultProvider
    : activeProvider;
}

/**
 * A `perpsDepositAndOrder` transaction prepared before the user taps
 * Long/Short, so the trade confirmation can open without first waiting on
 * transaction creation and approval queueing.
 *
 * The prepared deposit carries no asset, direction, or amount — it is a
 * zero-value USDC transfer — so one prewarmed transaction serves either
 * direction on any market, for the matching account and provider.
 *
 * Ownership is single-use. Exactly one of {@link claimPrewarmedDepositOrder} or
 * {@link discardPrewarmedDepositOrder} takes the transaction, and a generation
 * token makes sure prep that is still running cannot re-publish a transaction
 * somebody else already owns.
 */
interface PrewarmedDepositOrder {
  transactionId: string;
  accountAddress: string;
  providerId: string;
}

interface PrewarmCriteria {
  accountAddress: string;
  providerId: string;
}

let generation = 0;
let prewarmed: PrewarmedDepositOrder | undefined;
let inFlight: Promise<string> | undefined;
let inFlightCriteria: PrewarmCriteria | undefined;
/** Rejects a discarded in-flight prep. New prep waits so ids cannot be mixed. */
let draining: Promise<void> | undefined;

function matchesCriteria(
  stored: PrewarmCriteria | undefined,
  criteria: PrewarmCriteria,
): boolean {
  if (!stored) {
    return false;
  }
  return (
    stored.accountAddress.toLowerCase() ===
      criteria.accountAddress.toLowerCase() &&
    stored.providerId === criteria.providerId
  );
}

/** Drops module ownership so in-flight prep stops publishing into it. */
function releaseOwnership(): {
  entry: PrewarmedDepositOrder | undefined;
  pending: Promise<string> | undefined;
} {
  const released = { entry: prewarmed, pending: inFlight };
  generation += 1;
  prewarmed = undefined;
  inFlight = undefined;
  inFlightCriteria = undefined;
  return released;
}

function knownTransactionIds(): Set<string> {
  return new Set(
    Engine.context.TransactionController.state.transactions.map(
      (transaction) => transaction.id,
    ),
  );
}

/**
 * Id created by this `depositWithOrder` call. Prefers a transaction that
 * appeared after the snapshot so a discarded prep cannot pick up a later
 * prewarm's `lastDepositTransactionId`.
 */
function readCreatedTransactionId(idsBefore: Set<string>): string | null {
  const created =
    Engine.context.TransactionController.state.transactions.filter(
      (transaction) => !idsBefore.has(transaction.id),
    );
  if (created.length === 1) {
    return created[0].id;
  }

  const lastId = Engine.context.PerpsController.state.lastDepositTransactionId;
  if (lastId && created.some((transaction) => transaction.id === lastId)) {
    return lastId;
  }
  if (created.length > 0) {
    return created[created.length - 1].id;
  }
  return lastId;
}

/**
 * Whether the prewarmed transaction is still usable.
 *
 * A prewarm can be invalidated without us knowing: a dapp request calls
 * `ApprovalController.clearRequests`, locking the app clears approvals, and the
 * user can switch account or provider. The approval id is the transaction id,
 * so all of that is checkable from the transaction id alone.
 */
function isUsable(
  entry: PrewarmedDepositOrder,
  criteria: PrewarmCriteria,
): boolean {
  if (!matchesCriteria(entry, criteria)) {
    return false;
  }

  const { ApprovalController, TransactionController } = Engine.context;
  if (!ApprovalController.hasRequest({ id: entry.transactionId })) {
    return false;
  }

  const transaction = TransactionController.state.transactions.find(
    (candidate) => candidate.id === entry.transactionId,
  );
  return transaction?.status === TransactionStatus.unapproved;
}

/**
 * Prepares a `perpsDepositAndOrder` transaction in the background.
 *
 * No-ops when a usable prewarm already exists or one is being prepared, so
 * repeated focus events cannot stack up transactions.
 *
 * @param criteria - Account and provider the prewarm must be valid for.
 * @param depositWithOrder - Bound `PerpsController.depositWithOrder`.
 * @returns Promise resolving to the prewarmed transaction id, or undefined when
 * a usable prewarm is already available.
 */
export function prewarmDepositOrder(
  criteria: PrewarmCriteria,
  depositWithOrder: () => Promise<unknown>,
): Promise<string> | undefined {
  if (inFlight) {
    if (matchesCriteria(inFlightCriteria, criteria)) {
      return inFlight;
    }
    discardPrewarmedDepositOrder();
  }
  if (prewarmed) {
    if (isUsable(prewarmed, criteria)) {
      return undefined;
    }
    rejectTransaction(prewarmed.transactionId);
    prewarmed = undefined;
  }

  const ownedGeneration = generation;
  const pending = (async () => {
    if (draining) {
      await draining;
      draining = undefined;
    }

    const idsBefore = knownTransactionIds();
    await depositWithOrder();
    const transactionId = readCreatedTransactionId(idsBefore);
    if (!transactionId) {
      throw new Error('Prewarmed deposit order produced no transaction id');
    }
    if (generation === ownedGeneration) {
      prewarmed = { transactionId, ...criteria };
    }
    return transactionId;
  })().finally(() => {
    if (generation === ownedGeneration) {
      inFlight = undefined;
      inFlightCriteria = undefined;
    }
  });

  inFlight = pending;
  inFlightCriteria = criteria;
  return pending;
}

/**
 * Hands ownership of the prewarmed transaction to the caller.
 *
 * @param criteria - Account and provider the prewarm must be valid for.
 * @returns Promise resolving to the transaction id, or undefined when there is
 * nothing usable to claim and the caller must create a transaction itself.
 */
export function claimPrewarmedDepositOrder(
  criteria: PrewarmCriteria,
): Promise<string> | undefined {
  if (inFlight) {
    if (!matchesCriteria(inFlightCriteria, criteria)) {
      discardPrewarmedDepositOrder();
      return undefined;
    }

    const pending = releaseOwnership().pending;
    return pending?.then((transactionId) => {
      const entry = { transactionId, ...criteria };
      if (!isUsable(entry, criteria)) {
        rejectTransaction(transactionId);
        throw new Error('Prewarmed deposit order is no longer usable');
      }
      return transactionId;
    });
  }

  const entry = prewarmed;
  if (!entry || !isUsable(entry, criteria)) {
    if (entry) {
      rejectTransaction(entry.transactionId);
    }
    releaseOwnership();
    return undefined;
  }

  releaseOwnership();
  return Promise.resolve(entry.transactionId);
}

/**
 * Rejects an unclaimed prewarmed transaction so it never lingers as an
 * unapproved transaction. Safe to call when there is nothing to discard.
 */
export function discardPrewarmedDepositOrder(): void {
  const { entry, pending } = releaseOwnership();

  if (entry) {
    rejectTransaction(entry.transactionId);
  }

  if (pending) {
    draining = pending
      .then((transactionId) => {
        rejectTransaction(transactionId);
      })
      .catch(() => undefined);
  }
}

function rejectTransaction(transactionId: string): void {
  try {
    Engine.rejectPendingApproval(
      transactionId,
      providerErrors.userRejectedRequest(),
      { ignoreMissing: true, logErrors: false },
    );
  } catch (error) {
    DevLogger.log(
      '[prewarmedDepositOrder] Failed to discard prewarmed deposit order',
      error,
    );
  }
}

/** Test-only: clears module state without touching the controllers. */
export function resetPrewarmedDepositOrderForTesting(): void {
  generation += 1;
  prewarmed = undefined;
  inFlight = undefined;
  inFlightCriteria = undefined;
  draining = undefined;
}
