import { TransactionStatus } from '@metamask/transaction-controller';
import { providerErrors } from '@metamask/rpc-errors';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';
import {
  beginUnclaimedPrewarmTransaction,
  dropAllUnclaimedPrewarmTransactions,
  dropUnclaimedPrewarmTransaction,
  endUnclaimedPrewarmTransaction,
  releaseAllStashedPrewarmTransactionAdded,
  retainOnlyUnclaimedPrewarmTransaction,
} from './unclaimedPrewarmTransactionMetrics';

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
 *
 * A claim also leaves a `claimed` marker behind: Long/Short now owns
 * transaction creation, so a prewarm that fires afterwards (a tap landing
 * before the idle callback) must not add a second transaction. The marker is
 * cleared by {@link discardPrewarmedDepositOrder} or
 * {@link releasePrewarmedDepositOrderClaim}.
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

interface DepositWithOrderResult {
  result: Promise<string>;
}

type PrewarmState =
  | { status: 'idle' }
  | {
      status: 'preparing';
      criteria: PrewarmCriteria;
      transactionId: Promise<string>;
    }
  | { status: 'ready'; entry: PrewarmedDepositOrder }
  | { status: 'claimed' };

let state: PrewarmState = { status: 'idle' };

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

/** Gives the current state to the caller and clears module ownership. */
function takeState(): PrewarmState {
  const current = state;
  state = { status: 'idle' };
  return current;
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
 * repeated focus events cannot stack up transactions. Also no-ops after
 * Long/Short claimed the slot, so a tap that lands before the idle callback
 * does not end up with a second transaction.
 *
 * @param criteria - Account and provider the prewarm must be valid for.
 * @param depositWithOrder - Bound `PerpsController.depositWithOrder`.
 * @returns Promise resolving to the prewarmed transaction id, or undefined when
 * a usable prewarm is already available or Long/Short already claimed the slot.
 */
export function prewarmDepositOrder(
  criteria: PrewarmCriteria,
  depositWithOrder: () => Promise<DepositWithOrderResult>,
): Promise<string> | undefined {
  if (state.status === 'claimed') {
    return undefined;
  }
  if (state.status === 'preparing') {
    if (matchesCriteria(state.criteria, criteria)) {
      return state.transactionId;
    }
    discardPrewarmedDepositOrder();
  }
  if (state.status === 'ready') {
    if (isUsable(state.entry, criteria)) {
      return undefined;
    }
    rejectTransaction(state.entry.transactionId);
    state = { status: 'idle' };
  }

  // Hold Transaction Added / Rejected until Long/Short claims this insert.
  // The generation keeps a discarded in-flight prewarm from emitting or wiping
  // metrics for a prewarm that started while this promise was still running.
  const generation = beginUnclaimedPrewarmTransaction();
  const transactionId = depositWithOrder()
    .catch((error: unknown) => {
      // Creation failed before the transaction existed, so nothing of ours was
      // held back. Release anything else this generation suppressed alone.
      releaseAllStashedPrewarmTransactionAdded(generation);
      throw error;
    })
    .then(({ result }) => result)
    .then((id) => {
      retainOnlyUnclaimedPrewarmTransaction(generation, id);
      if (
        state.status === 'preparing' &&
        state.transactionId === transactionId
      ) {
        state = { status: 'ready', entry: { transactionId: id, ...criteria } };
      }
      return id;
    })
    .catch((error: unknown) => {
      dropAllUnclaimedPrewarmTransactions(generation);
      if (
        state.status === 'preparing' &&
        state.transactionId === transactionId
      ) {
        state = { status: 'idle' };
      }
      throw error;
    })
    .finally(() => {
      endUnclaimedPrewarmTransaction(generation);
    });

  state = {
    status: 'preparing',
    criteria,
    transactionId,
  };
  return transactionId;
}

function validateClaimedTransaction(
  transactionId: string,
  criteria: PrewarmCriteria,
): string {
  const entry = { transactionId, ...criteria };
  if (!isUsable(entry, criteria)) {
    rejectTransaction(transactionId);
    throw new Error('Prewarmed deposit order is no longer usable');
  }
  return transactionId;
}

/**
 * Hands ownership of the prewarmed transaction to the caller.
 *
 * Whatever the outcome, the caller now owns transaction creation: a prewarm
 * that fires after this call no-ops until {@link discardPrewarmedDepositOrder}
 * or {@link releasePrewarmedDepositOrderClaim} runs.
 *
 * @param criteria - Account and provider the prewarm must be valid for.
 * @returns Promise resolving to the transaction id, or undefined when there is
 * nothing usable to claim and the caller must create a transaction itself.
 */
export function claimPrewarmedDepositOrder(
  criteria: PrewarmCriteria,
): Promise<string> | undefined {
  const current = takeState();
  state = { status: 'claimed' };

  if (current.status === 'preparing') {
    if (!matchesCriteria(current.criteria, criteria)) {
      rejectWhenPrepared(current.transactionId);
      return undefined;
    }
    return current.transactionId.then((id) =>
      validateClaimedTransaction(id, criteria),
    );
  }

  if (current.status === 'ready') {
    if (!isUsable(current.entry, criteria)) {
      rejectTransaction(current.entry.transactionId);
      return undefined;
    }
    return Promise.resolve(current.entry.transactionId);
  }

  return undefined;
}

/**
 * Rejects an unclaimed prewarmed transaction so it never lingers as an
 * unapproved transaction, and clears any claim marker. Safe to call when
 * there is nothing to discard.
 */
export function discardPrewarmedDepositOrder(): void {
  const current = takeState();

  if (current.status === 'ready') {
    rejectTransaction(current.entry.transactionId);
  } else if (current.status === 'preparing') {
    rejectWhenPrepared(current.transactionId);
  }
}

/**
 * Lets prewarming resume after a claim. Called when the screen that owns
 * prewarming gains focus, so a Long/Short tap elsewhere cannot leave it
 * suppressed. Leaves a ready or in-flight prewarm untouched.
 */
export function releasePrewarmedDepositOrderClaim(): void {
  if (state.status === 'claimed') {
    state = { status: 'idle' };
  }
}

function rejectWhenPrepared(transactionId: Promise<string>): void {
  transactionId
    .then((id) => {
      rejectTransaction(id);
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
  // The rejected handler drops the id when the approval exists. This covers a
  // missing approval, which returns without emitting Transaction Rejected.
  dropUnclaimedPrewarmTransaction(transactionId);
}

/** Test-only: clears module state without touching the controllers. */
export function resetPrewarmedDepositOrderForTesting(): void {
  state = { status: 'idle' };
}
