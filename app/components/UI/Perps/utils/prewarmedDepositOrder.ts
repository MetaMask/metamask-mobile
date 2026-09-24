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

/** Drops module ownership so in-flight prep stops publishing into it. */
function releaseOwnership(): {
  entry: PrewarmedDepositOrder | undefined;
  pending: Promise<string> | undefined;
} {
  const released = { entry: prewarmed, pending: inFlight };
  generation += 1;
  prewarmed = undefined;
  inFlight = undefined;
  return released;
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
  if (
    entry.accountAddress.toLowerCase() !==
      criteria.accountAddress.toLowerCase() ||
    entry.providerId !== criteria.providerId
  ) {
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
    return inFlight;
  }
  if (prewarmed) {
    if (isUsable(prewarmed, criteria)) {
      return undefined;
    }
    // Stale record: its approval is already gone, so there is nothing to reject.
    prewarmed = undefined;
  }

  const ownedGeneration = generation;
  inFlight = depositWithOrder().then(() => {
    const transactionId =
      Engine.context.PerpsController.state.lastDepositTransactionId;
    if (!transactionId) {
      throw new Error('Prewarmed deposit order produced no transaction id');
    }
    if (generation === ownedGeneration) {
      prewarmed = { transactionId, ...criteria };
      inFlight = undefined;
    }
    return transactionId;
  });

  return inFlight;
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
    return releaseOwnership().pending;
  }

  const entry = prewarmed;
  if (!entry || !isUsable(entry, criteria)) {
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

  // Prep that has not resolved yet still produces a transaction; reject it once
  // it exists rather than leaking it.
  pending
    ?.then((transactionId) => {
      rejectTransaction(transactionId);
    })
    .catch(() => undefined);
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
}
