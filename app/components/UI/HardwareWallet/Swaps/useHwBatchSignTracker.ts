import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  executeHardwareWalletOperation,
  useHardwareWallet,
  type HardwareWalletOperationType,
} from '../../../../core/HardwareWallet';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
  type HardwareWalletsSwapsEvent,
} from './HardwareWalletsSwaps.state';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import Logger from '../../../../util/Logger';
import { isValidHexAddress } from '../../../../util/address';
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';

import { STX_NO_HASH_ERROR } from '../../../../util/smart-transactions/smart-publish-hook';

const HARDWARE_WALLET_OPERATION_TRANSACTION: HardwareWalletOperationType =
  'transaction';

const BATCH_CANCELLED_ERROR = 'Batch cancelled';

const APPROVAL_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridgeApproval,
  TransactionType.swapApproval,
]);

const TRADE_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridge,
  TransactionType.swap,
]);

const ALL_BATCH_TYPES: Set<TransactionType> = new Set([
  ...APPROVAL_TYPES,
  ...TRADE_TYPES,
]);

const NON_TERMINAL_CANCEL_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
]);

// Submitted txs are included above for cancel bookkeeping, but must not be
// locally aborted or dropped because they may still be pending on-chain.
const LOCALLY_DROPPABLE_CANCEL_STATUSES: ReadonlySet<TransactionStatus> =
  new Set([TransactionStatus.approved, TransactionStatus.signed]);

const TERMINAL_CANCEL_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.failed,
  TransactionStatus.rejected,
  TransactionStatus.submitted,
  TransactionStatus.confirmed,
  TransactionStatus.dropped,
]);

const FAILED_OR_REJECTED_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.failed,
  TransactionStatus.rejected,
]);

const TX_STATUS_UPDATED_EVENT =
  'TransactionController:transactionStatusUpdated';
const CANCEL_TERMINAL_WAIT_TIMEOUT_MS = 30_000;
const DEVICE_NOT_READY_RETRY_DELAY_MS = 1_000;

function isBatchTransactionType(
  txType: TransactionMeta['type'],
): txType is TransactionType {
  return Boolean(txType && ALL_BATCH_TYPES.has(txType));
}

/**
 * Normalizes an address for case-insensitive comparison or storage.
 *
 * EVM hex addresses are lower-cased (case-insensitive by spec).
 * Non-EVM addresses (Solana base58, Bitcoin base58check, bech32, etc.)
 * are returned as-is because their encodings are case-sensitive —
 * lower-casing would corrupt them and cause `matchesTx` to silently
 * fail to match transactions from the active hardware wallet.
 */
function normalizeAddress(address: string | undefined): string | undefined {
  if (!address) return undefined;
  return isValidHexAddress(address) ? address.toLowerCase() : address;
}

function matchesTx(
  transactionMeta: TransactionMeta,
  targetFrom: string,
): boolean {
  const normalizedFrom = normalizeAddress(transactionMeta.txParams.from);
  if (normalizedFrom !== targetFrom) return false;
  return isBatchTransactionType(transactionMeta.type);
}

function getStepKind(txType: TransactionType): HardwareWalletsSwapsStepKind {
  return APPROVAL_TYPES.has(txType)
    ? HardwareWalletsSwapsStepKind.Approval
    : HardwareWalletsSwapsStepKind.Transaction;
}

function getTransactions(): TransactionMeta[] {
  return Engine.context.TransactionController.state.transactions;
}

function getTransactionById(txId: string): TransactionMeta | undefined {
  return getTransactions().find(
    (transaction: TransactionMeta) => transaction.id === txId,
  );
}

/**
 * Returns the current pending ApprovalController approvals (always a plain
 * object, never undefined). Centralized so callers don't have to repeat the
 * `?? {}` fallback at every call site.
 */
function getPendingApprovals(): Record<
  string,
  { type: string; [key: string]: unknown }
> {
  return Engine.context.ApprovalController.state.pendingApprovals ?? {};
}

const POST_SIGN_BATCH_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.signed,
  TransactionStatus.submitted,
  TransactionStatus.confirmed,
]);

/** Transaction has been signed (or has progressed past signing). */
function isPostSignBatchTransaction(tx: TransactionMeta): boolean {
  return POST_SIGN_BATCH_STATUSES.has(tx.status);
}

/** Transaction is in a non-terminal, pre-broadcast state — still cancellable. */
function isPendingBatchTransaction(tx: TransactionMeta): boolean {
  return NON_TERMINAL_CANCEL_STATUSES.has(tx.status);
}

/** Transaction has failed or been rejected. */
function isFailedOrRejectedBatchTransaction(tx: TransactionMeta): boolean {
  return FAILED_OR_REJECTED_STATUSES.has(tx.status);
}

function hasSignedTrackedBatchFromAddress(
  batchId: string,
  address: string,
  pendingSignTxIds: ReadonlySet<string>,
): boolean {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return false;
  return getTransactions().some(
    (tx) =>
      pendingSignTxIds.has(tx.id) &&
      tx.batchId === batchId &&
      matchesTx(tx, normalizedAddress) &&
      isPostSignBatchTransaction(tx),
  );
}

function getCancellableBatchTxIds(
  address: string | undefined,
  pendingSignTxIds: Iterable<string>,
  relatedBatchIds: ReadonlySet<string>,
): string[] {
  const pendingSignTxIdList = [...pendingSignTxIds];
  const normalizedAddress = normalizeAddress(address);
  const nonTerminalTxIds =
    normalizedAddress && relatedBatchIds.size > 0
      ? getTransactions()
          .filter(
            (tx: TransactionMeta) =>
              matchesTx(tx, normalizedAddress) &&
              isPendingBatchTransaction(tx) &&
              Boolean(tx.batchId && relatedBatchIds.has(tx.batchId)),
          )
          .map((tx: TransactionMeta) => tx.id)
      : [];

  return [...new Set([...pendingSignTxIdList, ...nonTerminalTxIds])];
}

function getRelatedBatchIds(
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

function rejectPendingBatchApprovals({
  address,
  relatedBatchIds,
  relatedApprovalIds,
}: {
  address: string | undefined;
  relatedBatchIds: ReadonlySet<string>;
  relatedApprovalIds: ReadonlySet<string>;
}): boolean {
  const pendingApprovals = getPendingApprovals();
  let hadPendingApprovals = false;

  for (const [requestId, request] of Object.entries(pendingApprovals)) {
    if (
      !shouldRejectPendingApprovalOnCancel(
        requestId,
        request,
        address,
        relatedBatchIds,
        relatedApprovalIds,
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

function getFailedBatchTxChainIds(
  address: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
): Set<NonNullable<TransactionMeta['chainId']>> {
  const normalizedAddress = normalizeAddress(address);
  const failedBatchTxs = normalizedAddress
    ? getTransactions().filter(
        (tx: TransactionMeta) =>
          matchesTx(tx, normalizedAddress) &&
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

function wipeFailedBatchTransactions(
  address: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
): void {
  if (!address) return;
  if (relatedBatchIds.size === 0) return;

  for (const chainId of getFailedBatchTxChainIds(address, relatedBatchIds)) {
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

function abortTransactionSignings(
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

function dropAbortableTransactions(txIds: string[]): void {
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

function getPendingTransactionIds(txIds: string[]): Set<string> {
  return new Set(
    txIds.filter((id) => {
      const tx = getTransactionById(id);
      return tx && !TERMINAL_CANCEL_STATUSES.has(tx.status);
    }),
  );
}

function hasPendingTransactions(txIds: string[]): boolean {
  return getPendingTransactionIds(txIds).size > 0;
}

function waitForTerminalTransactions(txIds: string[]): Promise<void> {
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

function shouldRejectPendingApprovalOnCancel(
  requestId: string,
  request: { type: string },
  targetFrom: string | undefined,
  relatedBatchIds: ReadonlySet<string>,
  relatedApprovalIds: ReadonlySet<string>,
): boolean {
  if (!targetFrom) {
    return false;
  }

  if (request.type === ApprovalType.TransactionBatch) {
    return relatedBatchIds.has(requestId) || relatedApprovalIds.has(requestId);
  }

  if (request.type === ApprovalType.Transaction) {
    const txMeta = getTransactionById(requestId);
    if (!txMeta || !matchesTx(txMeta, targetFrom)) {
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

function hasMatchingBatchTransaction(
  batchId: string,
  targetFrom: string,
): boolean {
  return getTransactions().some(
    (tx: TransactionMeta) =>
      tx.batchId === batchId && matchesTx(tx, targetFrom),
  );
}

function getApprovedBatchTransactionIds(
  batchId: string,
  targetFrom: string,
): string[] {
  return getTransactions()
    .filter(
      (tx: TransactionMeta) =>
        tx.batchId === batchId &&
        matchesTx(tx, targetFrom) &&
        tx.status === TransactionStatus.approved,
    )
    .map((tx: TransactionMeta) => tx.id);
}

interface UseHwBatchSignTrackerOptions {
  fromAddress: string | undefined;
  isEnabled: boolean;
  retryGenerationRef?: React.RefObject<number>;
}

interface HwBatchSignTrackerState {
  currentBatchId: string | null | undefined;
  seenBatchIds: Set<string>;
  staleBatchIds: Set<string>;
  signedBatchIds: Set<string>;
  pendingSignTxIds: Set<string>;
  pendingAbortTxIds: Set<string>;
  acceptedApprovalIds: Set<string>;
  approvalQueue: string[];
  handledTxIds: Set<string>;
  signingDispatchedTxIds: Set<string>;
  isProcessingQueue: boolean;
  isCancellingBatch: boolean;
  batchGeneration: number;
  lastSeenGeneration: number;
}

interface HwBatchSignTrackerLatestValues {
  fromAddress: string | undefined;
  dispatch: ReturnType<typeof useDispatch>;
  trackEvent: ReturnType<typeof useAnalytics>['trackEvent'];
  createEventBuilder: ReturnType<typeof useAnalytics>['createEventBuilder'];
  ensureDeviceReady: ReturnType<typeof useHardwareWallet>['ensureDeviceReady'];
  setPendingOperationAddress: ReturnType<
    typeof useHardwareWallet
  >['setPendingOperationAddress'];
  showAwaitingConfirmation: ReturnType<
    typeof useHardwareWallet
  >['showAwaitingConfirmation'];
  hideAwaitingConfirmation: ReturnType<
    typeof useHardwareWallet
  >['hideAwaitingConfirmation'];
  showHardwareWalletError: ReturnType<
    typeof useHardwareWallet
  >['showHardwareWalletError'];
}

function createInitialBatchSignTrackerState(
  retryGeneration = 0,
): HwBatchSignTrackerState {
  return {
    currentBatchId: undefined,
    seenBatchIds: new Set(),
    staleBatchIds: new Set(),
    signedBatchIds: new Set(),
    pendingSignTxIds: new Set(),
    pendingAbortTxIds: new Set(),
    acceptedApprovalIds: new Set(),
    approvalQueue: [],
    handledTxIds: new Set(),
    signingDispatchedTxIds: new Set(),
    isProcessingQueue: false,
    isCancellingBatch: false,
    batchGeneration: 0,
    lastSeenGeneration: retryGeneration,
  };
}

export function useHwBatchSignTracker({
  fromAddress,
  isEnabled,
  retryGenerationRef,
}: UseHwBatchSignTrackerOptions) {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();
  const latestValuesRef = useRef<HwBatchSignTrackerLatestValues>({
    fromAddress,
    dispatch,
    trackEvent,
    createEventBuilder,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  });
  latestValuesRef.current = {
    fromAddress,
    dispatch,
    trackEvent,
    createEventBuilder,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  };
  const trackerStateRef = useRef(
    createInitialBatchSignTrackerState(retryGenerationRef?.current),
  );
  const processApprovalQueueRef = useRef<(() => void) | undefined>(undefined);
  const cancelInFlightRef = useRef<Promise<void> | null>(null);
  const deferredApprovalQueueRetryTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const trackerLifecycleKeyRef = useRef<string | undefined>(
    fromAddress && isEnabled ? normalizeAddress(fromAddress) : undefined,
  );
  const [confirmationTxId, setConfirmationTxId] = useState<
    string | undefined
  >();

  const invalidateBatchStateForRetry = useCallback(() => {
    const trackerState = trackerStateRef.current;
    trackerState.acceptedApprovalIds = new Set();
    trackerState.approvalQueue = [];
    trackerState.signedBatchIds = new Set();
    trackerState.pendingSignTxIds = new Set();
    trackerState.handledTxIds = new Set();
    trackerState.signingDispatchedTxIds = new Set();
    trackerState.batchGeneration += 1;

    for (const id of trackerState.seenBatchIds) {
      trackerState.staleBatchIds.add(id);
    }
    trackerState.seenBatchIds = new Set();
    trackerState.currentBatchId = null;
    setConfirmationTxId(undefined);
  }, []);

  // Detects whether the caller has bumped `retryGenerationRef` since the last
  // invocation. A bump signals that the consumer wants to restart the batch
  // signing flow from scratch (e.g. the user retried after an error, or the
  // parent component re-mounted the swap). When a change is detected we:
  //   1. Record the new generation so subsequent calls are no-ops until the
  //      ref is bumped again.
  //   2. Invalidate all in-flight batch state via invalidateBatchStateForRetry
  //      (clears the approval queue, marks seen batch IDs as stale, etc.).
  // Returns true when a retry was detected (and state was invalidated), false
  // otherwise. Callers use the boolean to short-circuit any work that would
  // otherwise operate on the now-stale batch state.
  const detectAndApplyRetryGeneration = useCallback((): boolean => {
    const trackerState = trackerStateRef.current;
    if (
      retryGenerationRef &&
      retryGenerationRef.current !== trackerState.lastSeenGeneration
    ) {
      trackerState.lastSeenGeneration = retryGenerationRef.current;
      invalidateBatchStateForRetry();
      return true;
    }
    return false;
  }, [retryGenerationRef, invalidateBatchStateForRetry]);

  const syncConfirmationTxId = useCallback(() => {
    setConfirmationTxId((current) => {
      const { pendingSignTxIds } = trackerStateRef.current;
      if (pendingSignTxIds.size === 0) {
        return undefined;
      }
      if (current && pendingSignTxIds.has(current)) {
        return current;
      }
      // Fall back to the next pending-sign tx (insertion order = oldest pending) so the UI doesn't go blank mid-batch.
      return pendingSignTxIds.values().next().value;
    });
  }, []);

  const isBatchIdFromCurrentBatch = useCallback(
    (batchId: string | undefined): boolean => {
      const { currentBatchId, staleBatchIds } = trackerStateRef.current;
      if (currentBatchId === undefined) return true;
      if (currentBatchId === null) {
        return batchId ? !staleBatchIds.has(batchId) : true;
      }
      return batchId === currentBatchId;
    },
    [],
  );

  // Named to parallel isBatchIdFromCurrentBatch — same predicate, but takes a
  // full TransactionMeta and delegates by extracting its batchId.
  const isTransactionFromCurrentBatch = useCallback(
    (transactionMeta: TransactionMeta): boolean =>
      isBatchIdFromCurrentBatch(transactionMeta.batchId),
    [isBatchIdFromCurrentBatch],
  );

  const isCancelledError = useCallback((error: unknown): boolean => {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return message === KEYSTONE_TX_CANCELED || message === STX_NO_HASH_ERROR;
  }, []);

  const trackTransactionCancelledEvent = useCallback(() => {
    const { trackEvent: latestTrackEvent, createEventBuilder: latestBuilder } =
      latestValuesRef.current;
    latestTrackEvent(
      latestBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED).build(),
    );
  }, []);

  const cancelCurrentBatch = useCallback(async () => {
    const inFlight = cancelInFlightRef.current;
    if (inFlight) {
      await inFlight;
      return;
    }

    const lifecycleKey = trackerLifecycleKeyRef.current;
    const cancelPromise = (async () => {
      const trackerState = trackerStateRef.current;
      const address = normalizeAddress(latestValuesRef.current.fromAddress);
      const relatedBatchIds = getRelatedBatchIds(
        trackerState.currentBatchId,
        trackerState.seenBatchIds,
        trackerState.pendingSignTxIds,
      );
      const outstandingTxIds = getCancellableBatchTxIds(
        address,
        trackerState.pendingSignTxIds,
        relatedBatchIds,
      );

      const relatedApprovalIds = new Set([
        ...trackerState.acceptedApprovalIds,
        ...trackerState.approvalQueue,
        ...trackerState.pendingSignTxIds,
      ]);

      trackerState.pendingSignTxIds = new Set();
      invalidateBatchStateForRetry();

      if (
        rejectPendingBatchApprovals({
          address,
          relatedBatchIds,
          relatedApprovalIds,
        })
      ) {
        trackTransactionCancelledEvent();
      }

      // Wipe chains with rejected/failed bridge txs so their nonces don't block retry
      // batches. We can't rely on txIds (already cleared by failure handler),
      // so scan all TransactionController transactions for failed/rejected bridge
      // txs from this address. If we leave these metas in TransactionController
      // state holding nonces N and N+1, TransactionController may assign nonces
      // N+2 and N+3 to the retry batch, creating a nonce gap that STX's
      // simulator rejects with would_revert.
      //
      // TransactionController only exposes a typed chain/address-scoped wipe
      // action, not a single-transaction delete action. Skip missing chain IDs
      // rather than widening to every chain for the address.
      wipeFailedBatchTransactions(address, relatedBatchIds);

      if (outstandingTxIds.length === 0) {
        return;
      }

      trackerState.pendingAbortTxIds = new Set(outstandingTxIds);
      trackerState.isCancellingBatch = true;

      abortTransactionSignings(
        outstandingTxIds,
        trackerState.pendingAbortTxIds,
      );

      // Only pre-broadcast txs are safe to local-drop; submitted txs may still
      // be pending on-chain and must remain visible in activity.
      dropAbortableTransactions(outstandingTxIds);
      try {
        await waitForTerminalTransactions(outstandingTxIds);
      } finally {
        trackerState.pendingAbortTxIds = new Set();
        trackerState.isCancellingBatch = false;
        if (trackerLifecycleKeyRef.current === lifecycleKey) {
          // Fire-and-forget: defer re-triggering the approval queue to the next microtask
          // to avoid synchronous recursion inside this cancel finally block.
          Promise.resolve().then(() => processApprovalQueueRef.current?.());
        }
      }
    })();

    cancelInFlightRef.current = cancelPromise;
    try {
      await cancelPromise;
    } finally {
      if (cancelInFlightRef.current === cancelPromise) {
        cancelInFlightRef.current = null;
      }
    }
  }, [invalidateBatchStateForRetry, trackTransactionCancelledEvent]);

  useEffect(() => {
    const trackerLifecycleKey =
      fromAddress && isEnabled ? normalizeAddress(fromAddress) : undefined;
    const clearDeferredApprovalQueueRetry = () => {
      if (!deferredApprovalQueueRetryTimeoutRef.current) {
        return;
      }

      clearTimeout(deferredApprovalQueueRetryTimeoutRef.current);
      deferredApprovalQueueRetryTimeoutRef.current = undefined;
    };

    if (trackerLifecycleKeyRef.current !== trackerLifecycleKey) {
      clearDeferredApprovalQueueRetry();
      trackerLifecycleKeyRef.current = trackerLifecycleKey;
      cancelInFlightRef.current = null;
      trackerStateRef.current = createInitialBatchSignTrackerState(
        retryGenerationRef?.current,
      );
      setConfirmationTxId(undefined);
    }

    if (!trackerLifecycleKey) {
      return undefined;
    }

    const targetFrom = trackerLifecycleKey;
    const scheduleDeferredApprovalQueueRetry = () => {
      clearDeferredApprovalQueueRetry();
      const lifecycleKey = trackerLifecycleKeyRef.current;
      deferredApprovalQueueRetryTimeoutRef.current = setTimeout(() => {
        deferredApprovalQueueRetryTimeoutRef.current = undefined;
        if (trackerLifecycleKeyRef.current !== lifecycleKey) {
          return;
        }

        processApprovalQueueRef.current?.();
      }, DEVICE_NOT_READY_RETRY_DELAY_MS);
    };

    const processApprovalQueue = async () => {
      if (detectAndApplyRetryGeneration()) {
        return;
      }
      const trackerState = trackerStateRef.current;
      if (trackerState.isProcessingQueue || trackerState.isCancellingBatch) {
        return;
      }
      clearDeferredApprovalQueueRetry();
      trackerState.isProcessingQueue = true;

      let deferredDueToDeviceNotReady = false;
      try {
        const myGeneration = trackerState.batchGeneration;
        const { approvalQueue } = trackerState;
        while (approvalQueue.length > 0) {
          if (trackerState.batchGeneration !== myGeneration) break;
          const maybeRequestId = approvalQueue.shift();
          if (!maybeRequestId) break;
          const requestId = maybeRequestId;
          let deviceConfirmedReady = false;
          let hasHandledRejection = false;
          let didDispatchCancellationRejection = false;
          let didHandleStxSubmissionFailure = false;

          const handleApprovalRejection = async (): Promise<void> => {
            if (hasHandledRejection) return;
            hasHandledRejection = true;
            if (trackerState.batchGeneration !== myGeneration) {
              return;
            }

            if (didHandleStxSubmissionFailure) {
              return;
            }

            if (!deviceConfirmedReady) {
              trackerState.approvalQueue.unshift(requestId);
              return;
            }

            const signedBatchIdCandidates = [
              trackerState.currentBatchId,
              requestId,
              getTransactionById(requestId)?.batchId,
            ];
            const isLateSignedBatchRejection = signedBatchIdCandidates.some(
              (batchId) =>
                typeof batchId === 'string' &&
                (trackerState.signedBatchIds.has(batchId) ||
                  hasSignedTrackedBatchFromAddress(
                    batchId,
                    targetFrom,
                    trackerState.pendingSignTxIds,
                  )),
            );
            if (isLateSignedBatchRejection) {
              return;
            }
            trackerState.acceptedApprovalIds.delete(requestId);
            Engine.rejectPendingApproval(
              requestId,
              new Error('User rejected the transaction'),
              { ignoreMissing: true, logErrors: false },
            );
            trackTransactionCancelledEvent();
            if (!didDispatchCancellationRejection) {
              latestValuesRef.current.dispatch(
                updateHardwareWalletsSwaps({
                  type: HardwareWalletsSwapsEventType.TransactionFailed,
                }),
              );
            }
            await cancelCurrentBatch();
          };

          try {
            const latestValues = latestValuesRef.current;
            const result = await executeHardwareWalletOperation({
              address: latestValues.fromAddress ?? targetFrom,
              operationType: HARDWARE_WALLET_OPERATION_TRANSACTION,
              ensureDeviceReady: latestValues.ensureDeviceReady,
              setPendingOperationAddress:
                latestValues.setPendingOperationAddress,
              showAwaitingConfirmation: latestValues.showAwaitingConfirmation,
              hideAwaitingConfirmation: latestValues.hideAwaitingConfirmation,
              showHardwareWalletError: latestValues.showHardwareWalletError,
              execute: async () => {
                deviceConfirmedReady = true;
                await Engine.context.ApprovalController.acceptRequest(
                  requestId,
                  undefined,
                  { waitForResult: true },
                );
              },
              onError: (error) => {
                // executeHardwareWalletOperation catches and never rethrows,
                // so this is our only chance to react to execute() errors.
                // Returning true suppresses the shared hardware-wallet bottom
                // sheet from flipping to an Error state — the swaps modal
                // surfaces these errors itself.
                if (!(error instanceof Error)) return false;
                const { message } = error;

                // STX submission failures arrive AFTER signing has succeeded.
                // handleApprovalRejection (onRejected) would skip them via its
                // "late signed batch rejection" guard, so dispatch the failure
                // here. Don't call cancelCurrentBatch — by this point the txs
                // are already in their terminal failed state from the STX
                // backend; dropping them would hide them from the activity
                // list.
                const isStxSubmissionFailure = message === STX_NO_HASH_ERROR;
                if (isStxSubmissionFailure) {
                  didHandleStxSubmissionFailure = true;
                  latestValuesRef.current.dispatch(
                    updateHardwareWalletsSwaps({
                      type: HardwareWalletsSwapsEventType.TransactionFailed,
                    }),
                  );
                }
                const isKeystoneCancel = message === KEYSTONE_TX_CANCELED;
                if (isKeystoneCancel) {
                  didDispatchCancellationRejection = true;
                  latestValuesRef.current.dispatch(
                    updateHardwareWalletsSwaps({
                      type: HardwareWalletsSwapsEventType.Rejected,
                    }),
                  );
                }

                return (
                  isStxSubmissionFailure ||
                  isKeystoneCancel ||
                  message === BATCH_CANCELLED_ERROR
                );
              },
              onRejected: handleApprovalRejection,
            });
            if (trackerState.batchGeneration !== myGeneration) {
              break;
            }
            if (result) {
              trackerState.acceptedApprovalIds.delete(requestId);
            }
            // Device-not-ready (and pre-execute confirmation dismiss) re-queue
            // via unshift; exit the drain loop so we do not tight-loop in this tick
            // or immediately reschedule in finally (wait for a new enqueue pass).
            if (!deviceConfirmedReady) {
              deferredDueToDeviceNotReady = true;
              break;
            }
          } catch (error) {
            if (isCancelledError(error)) {
              trackTransactionCancelledEvent();
            } else {
              Logger.error(
                error as Error,
                'error while trying to send transaction (HW BatchSign)',
              );
            }
            await handleApprovalRejection();
          }
        }
      } finally {
        trackerStateRef.current.isProcessingQueue = false;
        const hasQueuedApprovals =
          trackerStateRef.current.approvalQueue.length > 0;
        if (deferredDueToDeviceNotReady && hasQueuedApprovals) {
          scheduleDeferredApprovalQueueRetry();
        } else if (hasQueuedApprovals) {
          // Fire-and-forget: schedule another drain on the next microtask so
          // we don't tight-loop in the current tick or recurse synchronously.
          // Rejections inside processApprovalQueue are caught by its own
          // try/catch, so we don't await here.
          Promise.resolve().then(processApprovalQueue);
        }
      }
    };

    const enqueuePendingApprovals = () => {
      detectAndApplyRetryGeneration();
      const pendingApprovals = getPendingApprovals();

      for (const [requestId, request] of Object.entries(pendingApprovals)) {
        const trackerState = trackerStateRef.current;
        if (trackerState.acceptedApprovalIds.has(requestId)) {
          continue;
        }

        if (request.type === ApprovalType.Transaction) {
          const txMeta = getTransactions().find(
            (tx: TransactionMeta) => tx.id === requestId,
          );
          if (
            txMeta &&
            matchesTx(txMeta, targetFrom) &&
            isTransactionFromCurrentBatch(txMeta)
          ) {
            trackerState.acceptedApprovalIds.add(requestId);
            if (txMeta.status === TransactionStatus.approved) {
              trackerState.pendingSignTxIds.add(txMeta.id);
            }
            trackerState.approvalQueue.push(requestId);
          }
        } else if (
          request.type === ApprovalType.TransactionBatch &&
          isBatchIdFromCurrentBatch(requestId) &&
          hasMatchingBatchTransaction(requestId, targetFrom)
        ) {
          trackerState.acceptedApprovalIds.add(requestId);
          getApprovedBatchTransactionIds(requestId, targetFrom).forEach(
            (txId) => trackerState.pendingSignTxIds.add(txId),
          );
          trackerState.approvalQueue.push(requestId);
        }
      }

      processApprovalQueue();
    };
    processApprovalQueueRef.current = processApprovalQueue;

    const dispatchSwapEvent = (event: HardwareWalletsSwapsEvent) => {
      latestValuesRef.current.dispatch(updateHardwareWalletsSwaps(event));
    };

    const hasPendingApprovalForTransactionMeta = (
      transactionMeta: TransactionMeta,
    ): boolean => {
      const pendingApprovals = getPendingApprovals();
      const transactionApproval = pendingApprovals[transactionMeta.id];
      if (transactionApproval?.type === ApprovalType.Transaction) {
        return true;
      }

      const { batchId } = transactionMeta;
      if (!batchId) {
        return false;
      }

      return pendingApprovals[batchId]?.type === ApprovalType.TransactionBatch;
    };

    const shouldAcceptRetryApprovalForStaleBatch = (
      transactionMeta: TransactionMeta,
    ): boolean =>
      transactionMeta.status === TransactionStatus.approved &&
      Boolean(
        transactionMeta.batchId &&
          trackerStateRef.current.staleBatchIds.has(transactionMeta.batchId) &&
          hasPendingApprovalForTransactionMeta(transactionMeta),
      );

    const completeTrackedTx = (txId: string) => {
      trackerStateRef.current.handledTxIds.add(txId);
      trackerStateRef.current.pendingSignTxIds.delete(txId);
      syncConfirmationTxId();
    };

    const shouldIgnoreTerminalTx = (transactionMeta: TransactionMeta) => {
      if (!matchesTx(transactionMeta, targetFrom)) return true;

      // If a retry bumped the batch generation, only terminal events from the
      // previous generation's batches should be ignored. A new batch can hit a
      // terminal event before any approved/signed status event, and the swaps UI
      // still needs that Rejected/Failed signal.
      if (
        detectAndApplyRetryGeneration() &&
        transactionMeta.batchId &&
        trackerStateRef.current.staleBatchIds.has(transactionMeta.batchId)
      ) {
        return true;
      }

      if (trackerStateRef.current.handledTxIds.has(transactionMeta.id)) {
        return true;
      }
      if (!isTransactionFromCurrentBatch(transactionMeta)) return true;
      if (trackerStateRef.current.pendingAbortTxIds.has(transactionMeta.id)) {
        trackerStateRef.current.pendingAbortTxIds.delete(transactionMeta.id);
        return true;
      }

      return false;
    };

    const handleStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;

      // detectAndApplyRetryGeneration() may invalidate state (resetting currentBatchId and
      // marking the previous batch ids as stale). Combined with the stale-batch
      // set check, this ensures we ignore status updates for the previous
      // retry's batch — they would otherwise race against the new batch's
      // events and confuse the UI.
      const didAdvanceRetryGeneration = detectAndApplyRetryGeneration();
      if (didAdvanceRetryGeneration && transactionMeta.batchId) {
        if (shouldAcceptRetryApprovalForStaleBatch(transactionMeta)) {
          trackerStateRef.current.staleBatchIds.delete(transactionMeta.batchId);
        } else if (
          trackerStateRef.current.staleBatchIds.has(transactionMeta.batchId)
        ) {
          return;
        }
      }

      const { status, type } = transactionMeta;
      if (!isBatchTransactionType(type)) return;
      const stepKind = getStepKind(type);

      if (status === TransactionStatus.approved) {
        if (!isTransactionFromCurrentBatch(transactionMeta)) {
          return;
        }
        if (
          trackerStateRef.current.signingDispatchedTxIds.has(transactionMeta.id)
        ) {
          return;
        }
        if (transactionMeta.batchId) {
          const trackerState = trackerStateRef.current;
          trackerState.seenBatchIds.add(transactionMeta.batchId);
          if (
            !trackerState.currentBatchId &&
            !trackerState.staleBatchIds.has(transactionMeta.batchId)
          ) {
            trackerState.currentBatchId = transactionMeta.batchId;
          }
        }
        trackerStateRef.current.signingDispatchedTxIds.add(transactionMeta.id);
        trackerStateRef.current.pendingSignTxIds.add(transactionMeta.id);
        setConfirmationTxId(transactionMeta.id);
        dispatchSwapEvent({
          type: HardwareWalletsSwapsEventType.Signing,
          payload: { stepKind },
        });
        enqueuePendingApprovals();
      } else if (status === TransactionStatus.signed) {
        if (shouldIgnoreTerminalTx(transactionMeta)) {
          return;
        }
        if (transactionMeta.batchId) {
          trackerStateRef.current.signedBatchIds.add(transactionMeta.batchId);
        }
        dispatchSwapEvent({
          type: HardwareWalletsSwapsEventType.Signed,
          payload: { stepKind },
        });
        completeTrackedTx(transactionMeta.id);
      } else if (status === TransactionStatus.confirmed) {
        if (shouldIgnoreTerminalTx(transactionMeta)) {
          return;
        }
        completeTrackedTx(transactionMeta.id);
      } else if (status === TransactionStatus.dropped) {
        if (shouldIgnoreTerminalTx(transactionMeta)) {
          return;
        }
        trackTransactionCancelledEvent();
        dispatchSwapEvent({
          type: HardwareWalletsSwapsEventType.Rejected,
          payload: { stepKind },
        });
        completeTrackedTx(transactionMeta.id);
      }
    };

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (shouldIgnoreTerminalTx(transactionMeta)) return;

      const { type } = transactionMeta;
      if (!isBatchTransactionType(type)) return;
      const stepKind = getStepKind(type);
      trackTransactionCancelledEvent();
      dispatchSwapEvent({
        type: HardwareWalletsSwapsEventType.Rejected,
        payload: { stepKind },
      });
      completeTrackedTx(transactionMeta.id);
    };

    const handleFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (shouldIgnoreTerminalTx(transactionMeta)) return;

      dispatchSwapEvent({
        type: HardwareWalletsSwapsEventType.TransactionFailed,
      });
      completeTrackedTx(transactionMeta.id);
    };

    Engine.controllerMessenger.subscribe(
      TX_STATUS_UPDATED_EVENT,
      handleStatusUpdated,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionRejected',
      handleRejected,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      handleFailed,
    );
    Engine.controllerMessenger.subscribe(
      'ApprovalController:stateChange',
      enqueuePendingApprovals,
    );
    enqueuePendingApprovals();

    return () => {
      clearDeferredApprovalQueueRetry();
      processApprovalQueueRef.current = undefined;
      Engine.controllerMessenger.unsubscribe(
        TX_STATUS_UPDATED_EVENT,
        handleStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionRejected',
        handleRejected,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionFailed',
        handleFailed,
      );
      Engine.controllerMessenger.unsubscribe(
        'ApprovalController:stateChange',
        enqueuePendingApprovals,
      );
    };
  }, [
    cancelCurrentBatch,
    detectAndApplyRetryGeneration,
    fromAddress,
    isBatchIdFromCurrentBatch,
    isCancelledError,
    isEnabled,
    isTransactionFromCurrentBatch,
    retryGenerationRef,
    syncConfirmationTxId,
    trackTransactionCancelledEvent,
  ]);

  return { cancelCurrentBatch, confirmationTxId };
}
