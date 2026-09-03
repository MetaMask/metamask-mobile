import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import {
  ALL_BATCH_TYPES,
  BATCH_CANCELLED_ERROR,
  CANCEL_TERMINAL_WAIT_TIMEOUT_MS,
  LOCALLY_DROPPABLE_CANCEL_STATUSES,
  TERMINAL_CANCEL_STATUSES,
  TX_STATUS_UPDATED_EVENT,
} from './constants';
import {
  isFailedOrRejectedBatchTransaction,
  isPendingBatchTransaction,
  matchesTx,
  normalizeAddress,
} from './shared-filters';
import type { HwBatchSignTrackerState } from './types';

/** Returns all transactions currently held by the TransactionController. */
export function getTransactions(): TransactionMeta[] {
  return Engine.context.TransactionController.state.transactions;
}

/** Looks up a single transaction by id from the TransactionController state. */
export function getTransactionById(txId: string): TransactionMeta | undefined {
  return getTransactions().find(
    (transaction: TransactionMeta) => transaction.id === txId,
  );
}

/**
 * Returns the current pending ApprovalController approvals (always a plain
 * object, never undefined). Centralized so callers don't have to repeat the
 * `?? {}` fallback at every call site.
 */
export function getPendingApprovals(): Record<
  string,
  { type: string; [key: string]: unknown }
> {
  return Engine.context.ApprovalController.state.pendingApprovals ?? {};
}

/**
 * Collects the union of transaction ids that should be cancelled for a batch:
 * the explicitly tracked pending-sign ids plus any non-terminal (still
 * cancellable) batch transactions from the given address within the related
 * batch ids.
 */
export function getCancellableBatchTxIds(
  address: string | undefined,
  pendingSignTxIds: Iterable<string>,
  relatedBatchIds: ReadonlySet<string>,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): string[] {
  const pendingSignTxIdList = [...pendingSignTxIds];
  const normalizedAddress = normalizeAddress(address);
  const nonTerminalTxIds =
    normalizedAddress && relatedBatchIds.size > 0
      ? getTransactions()
          .filter(
            (tx: TransactionMeta) =>
              matchesTx(tx, normalizedAddress, trackedTypes) &&
              isPendingBatchTransaction(tx) &&
              Boolean(tx.batchId && relatedBatchIds.has(tx.batchId)),
          )
          .map((tx: TransactionMeta) => tx.id)
      : [];

  return [...new Set([...pendingSignTxIdList, ...nonTerminalTxIds])];
}

/**
 * Gathers every batch id relevant to the current cancellation: the active
 * batch id, all previously seen batch ids, and any batch ids referenced by the
 * given transaction ids.
 */
export function getRelatedBatchIds(
  activeBatchId: string | null | undefined,
  seenBatchIds: ReadonlySet<string>,
  txIds: Iterable<string>,
): Set<string> {
  const relatedBatchIds = new Set<string>();

  if (typeof activeBatchId === 'string') {
    relatedBatchIds.add(activeBatchId);
  }

  for (const batchId of seenBatchIds) {
    relatedBatchIds.add(batchId);
  }

  for (const txId of txIds) {
    const tx = getTransactionById(txId);
    if (tx?.batchId) {
      relatedBatchIds.add(tx.batchId);
    }
  }

  return relatedBatchIds;
}

/**
 * Decides whether a single pending approval should be rejected during a batch
 * cancel. Matches TransactionBatch approvals by id, and Transaction approvals
 * by the signing address (and batch id when present).
 */
function shouldRejectPendingApprovalOnCancel(
  requestId: string,
  request: { type: string },
  targetFrom: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
  relatedApprovalIds: ReadonlySet<string>,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): boolean {
  if (!targetFrom) {
    return false;
  }

  if (request.type === ApprovalType.TransactionBatch) {
    return relatedBatchIds.has(requestId) || relatedApprovalIds.has(requestId);
  }

  if (request.type === ApprovalType.Transaction) {
    const txMeta = getTransactionById(requestId);
    if (!txMeta || !matchesTx(txMeta, targetFrom, trackedTypes)) {
      return false;
    }

    // Bridge/swap Transaction approvals are enqueued without requiring batchId;
    // reject any tracked approval that matches the active address.
    if (!txMeta.batchId) {
      return true;
    }

    if (!relatedApprovalIds.has(requestId)) {
      return false;
    }

    return relatedBatchIds.has(txMeta.batchId);
  }

  return false;
}

/**
 * Rejects all pending ApprovalController approvals that belong to the active
 * batch (by matching batch id, approval id, or signing address). Returns
 * whether any approval was actually rejected, so callers can fire cancel
 * analytics only when relevant.
 */
export function rejectPendingBatchApprovals({
  address,
  relatedBatchIds,
  relatedApprovalIds,
  ignoredApprovalIds,
  ignoreUnbatchedTransactionApprovals,
  trackedTypes = ALL_BATCH_TYPES,
}: {
  address: string | undefined;
  relatedBatchIds: ReadonlySet<string>;
  relatedApprovalIds: ReadonlySet<string>;
  ignoredApprovalIds?: ReadonlySet<string>;
  ignoreUnbatchedTransactionApprovals?: boolean;
  trackedTypes?: Set<TransactionType>;
}): boolean {
  const pendingApprovals = getPendingApprovals();
  let hadPendingApprovals = false;

  for (const [requestId, request] of Object.entries(pendingApprovals)) {
    if (ignoredApprovalIds?.has(requestId)) {
      continue;
    }

    if (
      ignoreUnbatchedTransactionApprovals &&
      request.type === ApprovalType.Transaction &&
      !getTransactionById(requestId)?.batchId
    ) {
      continue;
    }

    if (
      !shouldRejectPendingApprovalOnCancel(
        requestId,
        request,
        address,
        relatedBatchIds,
        relatedApprovalIds,
        trackedTypes,
      )
    ) {
      continue;
    }

    Engine.rejectPendingApproval(requestId, new Error(BATCH_CANCELLED_ERROR), {
      ignoreMissing: true,
      logErrors: false,
    });
    hadPendingApprovals = true;
  }

  return hadPendingApprovals;
}

/**
 * Returns the set of chain ids that contain failed/rejected batch transactions
 * from the given address within the related batch ids — used to scope
 * nonce-clearing wipes on retry.
 */
export function getFailedBatchTxChainIds(
  address: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): Set<NonNullable<TransactionMeta['chainId']>> {
  const normalizedAddress = normalizeAddress(address);
  const failedBatchTxs = normalizedAddress
    ? getTransactions().filter(
        (tx: TransactionMeta) =>
          matchesTx(tx, normalizedAddress, trackedTypes) &&
          Boolean(tx.batchId && relatedBatchIds.has(tx.batchId)) &&
          isFailedOrRejectedBatchTransaction(tx),
      )
    : [];

  return new Set(
    failedBatchTxs
      .map((tx) => tx.chainId)
      .filter((chainId): chainId is NonNullable<TransactionMeta['chainId']> =>
        Boolean(chainId),
      ),
  );
}

/**
 * Wipes failed/rejected batch transactions (per chain) so their held nonces
 * don't create gaps that would cause the retry batch to be rejected by the STX
 * simulator.
 */
export function wipeFailedBatchTransactions(
  address: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): void {
  if (!address) return;
  if (relatedBatchIds.size === 0) return;

  for (const chainId of getFailedBatchTxChainIds(
    address,
    relatedBatchIds,
    trackedTypes,
  )) {
    try {
      Engine.controllerMessenger.call(
        'TransactionController:wipeTransactions',
        { address, chainId },
      );
    } catch (error) {
      Logger.log(
        '[HW-BatchSign] cancelCurrentBatch — failed to wipe transactions:',
        { address, chainId },
        error,
      );
    }
  }
}

/**
 * Aborts in-progress signing for the given transaction ids via the
 * TransactionController. Ids that can no longer be aborted are dropped from the
 * pending-abort set so the terminal-wait loop doesn't block waiting for an
 * abort that will never fire.
 */
export function abortTransactionSignings(
  txIds: string[],
  pendingAbortTxIds: Set<string>,
): void {
  for (const txId of txIds) {
    const tx = getTransactionById(txId);
    if (tx && !LOCALLY_DROPPABLE_CANCEL_STATUSES.has(tx.status)) {
      continue;
    }

    try {
      Engine.context.TransactionController.abortTransactionSigning(txId);
    } catch {
      // If the abort failed (e.g. tx transitioned out of the abortable window
      // between our status check and the call, or already cleared by a parallel
      // cancellation path), drop the id from the pending-abort set so the
      // terminal-wait loop doesn't keep waiting for an abort that will never
      // fire. The tx will still resolve naturally via its own status events.
      pendingAbortTxIds.delete(txId);
    }
  }
}

/**
 * Locally marks still-abortable (approved/signed, pre-broadcast) transactions
 * as `dropped` so they don't linger in activity after a batch cancel.
 * Submitted transactions are intentionally left untouched — they may still be
 * pending on-chain.
 */
export function dropAbortableTransactions(txIds: string[]): void {
  for (const txId of txIds) {
    const tx = getTransactionById(txId);
    if (!tx || !LOCALLY_DROPPABLE_CANCEL_STATUSES.has(tx.status)) {
      continue;
    }

    try {
      Engine.controllerMessenger.call(
        'TransactionController:updateTransaction',
        { ...tx, status: TransactionStatus.dropped },
        'HW batch cancelled — dropping signed tx',
      );
    } catch {
      // intentionally ignored
    }
  }
}

/** Returns the subset of the given ids that are not yet in a terminal status. */
export function getPendingTransactionIds(txIds: string[]): Set<string> {
  return new Set(
    txIds.filter((id) => {
      const tx = getTransactionById(id);
      return tx && !TERMINAL_CANCEL_STATUSES.has(tx.status);
    }),
  );
}

/** True if any of the given ids are not yet in a terminal status. */
export function hasPendingTransactions(txIds: string[]): boolean {
  return getPendingTransactionIds(txIds).size > 0;
}

/**
 * Returns a promise that resolves once every given transaction id reaches a
 * terminal status, or after a safety timeout
 * (`CANCEL_TERMINAL_WAIT_TIMEOUT_MS`), whichever comes first. Subscribes to
 * TransactionController status updates and cleans up its subscription on
 * resolve.
 */
export function waitForTerminalTransactions(txIds: string[]): Promise<void> {
  if (!hasPendingTransactions(txIds)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const remaining = getPendingTransactionIds(txIds);
    let isSubscribed = false;
    let isResolved = false;
    const timeoutRef: {
      current?: ReturnType<typeof setTimeout>;
    } = {};

    const handler = ({
      transactionMeta,
    }: {
      transactionMeta: { id: string; status: TransactionStatus };
    }) => {
      if (
        remaining.has(transactionMeta.id) &&
        TERMINAL_CANCEL_STATUSES.has(transactionMeta.status)
      ) {
        remaining.delete(transactionMeta.id);
        if (remaining.size === 0) {
          finish();
        }
      }
    };

    const cleanup = () => {
      if (!isSubscribed) return;
      Engine.controllerMessenger.unsubscribe(TX_STATUS_UPDATED_EVENT, handler);
      isSubscribed = false;
    };

    function finish() {
      if (isResolved) return;
      isResolved = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      cleanup();
      resolve();
    }

    timeoutRef.current = setTimeout(finish, CANCEL_TERMINAL_WAIT_TIMEOUT_MS);

    Engine.controllerMessenger.subscribe(TX_STATUS_UPDATED_EVENT, handler);
    isSubscribed = true;

    if (!hasPendingTransactions(txIds)) {
      finish();
    }
  });
}

/**
 * True if any transaction in the given batch is from the target address.
 *
 * Used in `enqueuePendingApprovals` to confirm a TransactionBatch approval
 * actually belongs to the active hardware wallet before accepting it — guards
 * against signing batches that contain transactions for other accounts.
 */
export function hasMatchingBatchTransaction(
  batchId: string,
  targetFrom: string,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): boolean {
  return getTransactions().some(
    (tx: TransactionMeta) =>
      tx.batchId === batchId && matchesTx(tx, targetFrom, trackedTypes),
  );
}

/**
 * True if any transaction exists for the given batch id (any address).
 *
 * Used as a fallback in `enqueuePendingApprovals`: a batch approval can land
 * before its child transactions are registered with the TransactionController,
 * so when the batch is still empty we accept the approval and let the txs
 * populate on a later event rather than dropping the batch entirely.
 */
export function hasAnyBatchTransaction(batchId: string): boolean {
  return getTransactions().some(
    (tx: TransactionMeta) => tx.batchId === batchId,
  );
}

/**
 * Returns the ids of all `approved` transactions in the given batch that are
 * from the target address — these are the txs queued for hardware signing.
 */
export function getApprovedBatchTransactionIds(
  batchId: string,
  targetFrom: string,
  trackedTypes: Set<TransactionType> = ALL_BATCH_TYPES,
): string[] {
  return getTransactions()
    .filter(
      (tx: TransactionMeta) =>
        tx.batchId === batchId &&
        matchesTx(tx, targetFrom, trackedTypes) &&
        tx.status === TransactionStatus.approved,
    )
    .map((tx: TransactionMeta) => tx.id);
}

/**
 * Builds a fresh tracker state object, seeded with the current retry generation
 * so the first retry bump is detected correctly.
 */
export function createInitialBatchSignTrackerState(): HwBatchSignTrackerState {
  return {
    signedBatchIds: new Set(),
    pendingSignTxIds: new Set(),
    pendingAbortTxIds: new Set(),
    acceptedApprovalIds: new Set(),
    approvalQueue: [],
    handledTxIds: new Set(),
    signingDispatchedTxIds: new Set(),
    sendTransactionStepIndexes: new Map(),
    isProcessingQueue: false,
    isCancellingBatch: false,
  };
}
