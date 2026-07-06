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
import { KEYSTONE_TX_CANCELED } from '../../../../constants/error';

import { STX_NO_HASH_ERROR } from '../../../../util/smart-transactions/smart-publish-hook';
import { Flow } from './flowStrategy';
import {
  ALL_BATCH_TYPES,
  BATCH_CANCELLED_ERROR,
  DEVICE_NOT_READY_RETRY_DELAY_MS,
  HARDWARE_WALLET_OPERATION_TRANSACTION,
  SEND_TYPES,
  TX_STATUS_UPDATED_EVENT,
} from './hw-batch-sign/constants';
import type {
  HwBatchSignTrackerLatestValues,
  UseHwBatchSignTrackerOptions,
} from './hw-batch-sign/types';
import {
  getStepKind,
  hasSignedTrackedBatchFromAddress,
  isBatchTransactionType,
  matchesTx,
  normalizeAddress,
} from './hw-batch-sign/shared-filters';
import {
  abortTransactionSignings,
  createInitialBatchSignTrackerState,
  dropAbortableTransactions,
  getApprovedBatchTransactionIds,
  getCancellableBatchTxIds,
  getPendingApprovals,
  getRelatedBatchIds,
  getTransactionById,
  getTransactions,
  hasAnyBatchTransaction,
  hasMatchingBatchTransaction,
  rejectPendingBatchApprovals,
  waitForTerminalTransactions,
  wipeFailedBatchTransactions,
} from './hw-batch-sign/utils';
import { createBatchTrackingStrategy } from './hw-batch-sign/batch-tracking-strategy';
import {
  type SignedEventClassifier,
  type StrategyConfig,
  type StrategyEventResult,
  type TrackingStrategy,
  NO_ACTION,
} from './hw-batch-sign/tracking-strategy';

/**
 * Drives hardware-wallet signing for a multi-step bridge/swap batch.
 *
 * Subscribes to TransactionController and ApprovalController events, manages
 * the signing state machine, and exposes `cancelCurrentBatch` to abort and
 * clean up an in-flight batch.
 *
 * Batch-tracking state (currentBatchId, seenBatchIds, etc.) is owned by the
 * TrackingStrategy. The hook only holds signing-orchestration state and
 * provides flow-specific classifyFn closures.
 */
export function useHwBatchSignTracker({
  fromAddress,
  isEnabled,
  retryGenerationRef,
  // Gasless 2-step: (1) approval → (2) FeeTransfer + main tx
  flow = Flow.Bridge, // Session origin: Bridge or Send
  gasTokenAddress, // Step (2) — gas-fee-token address for FeeTransfer (sendbundle)
  deferredApprovalRequestId, // Step (1) — approval consumed by submit, skipped by tracker
  expectedBatchTransactionCount,
}: UseHwBatchSignTrackerOptions) {
  // SEND-MODE ISOLATION: send-mode activates ONLY when flow===Flow.Send.
  // Bridge callers pass no flow → bridge branches stay byte-identical. DO NOT "simplify" this gate.
  const isSendMode = flow === Flow.Send;
  const trackedTypes: Set<TransactionType> = isSendMode
    ? SEND_TYPES
    : ALL_BATCH_TYPES;
  const normalizedGasTokenAddress = normalizeAddress(gasTokenAddress);

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
    trackedTypes,
    normalizedGasTokenAddress,
    dispatch,
    trackEvent,
    createEventBuilder,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    isSendMode,
    deferredApprovalRequestId,
    expectedBatchTransactionCount,
  });
  latestValuesRef.current = {
    fromAddress,
    trackedTypes,
    normalizedGasTokenAddress,
    dispatch,
    trackEvent,
    createEventBuilder,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    isSendMode,
    deferredApprovalRequestId,
    expectedBatchTransactionCount,
  };
  const trackerStateRef = useRef(createInitialBatchSignTrackerState());
  // Strategy owns batch-tracking state (currentBatchId, seenBatchIds,
  // staleBatchIds, trackedTxIds, lastSeenGeneration). The hook delegates
  // batch-locking/stale-filtering to it and only holds signing state.
  const strategyRef = useRef<TrackingStrategy | undefined>(undefined);
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
    // Reset hook-local signing state. Batch-tracking state is handled by
    // strategy.checkRetryGeneration() — do NOT call strategy.reset() here.
    trackerState.acceptedApprovalIds = new Set();
    trackerState.approvalQueue = [];
    trackerState.signedBatchIds = new Set();
    trackerState.pendingSignTxIds = new Set();
    trackerState.handledTxIds = new Set();
    trackerState.signingDispatchedTxIds = new Set();
    trackerState.sendTransactionStepIndexes = new Map();
    strategyRef.current?.cancelReset();
    setConfirmationTxId(undefined);
  }, []);

  // Detects a bump in `retryGenerationRef`, which signals a full batch restart.
  // When detected, invalidates all in-flight signing state. Returns true on retry.
  const detectAndApplyRetryGeneration = useCallback((): boolean => {
    const didRetry =
      strategyRef.current?.checkRetryGeneration(retryGenerationRef?.current) ??
      false;
    if (didRetry) {
      invalidateBatchStateForRetry();
    }
    return didRetry;
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
      const { trackedTypes: cancelTrackedTypes } = latestValuesRef.current;
      const address = normalizeAddress(latestValuesRef.current.fromAddress);
      // The strategy owns seen/current batch ids; derive related batch ids from
      // the tracked tx ids it exposes (each tx carries its batchId).
      const trackedTxIds =
        strategyRef.current?.getTrackedTxIds() ?? new Set<string>();
      const relatedBatchIds = getRelatedBatchIds(
        undefined,
        new Set<string>(),
        trackedTxIds,
      );
      const outstandingTxIds = getCancellableBatchTxIds(
        address,
        trackerState.pendingSignTxIds,
        relatedBatchIds,
        cancelTrackedTypes,
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
          ignoredApprovalIds: latestValuesRef.current.deferredApprovalRequestId
            ? new Set([latestValuesRef.current.deferredApprovalRequestId])
            : undefined,
          ignoreUnbatchedTransactionApprovals:
            latestValuesRef.current.isSendMode,
          trackedTypes: cancelTrackedTypes,
        })
      ) {
        trackTransactionCancelledEvent();
      }

      // Wipe chains with rejected/failed tracked txs so their held nonces
      // don't create gaps that cause STX's simulator to reject the retry
      // batch with would_revert.trackedTypes covers send too.
      wipeFailedBatchTransactions(address, relatedBatchIds, cancelTrackedTypes);

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
      trackerStateRef.current = createInitialBatchSignTrackerState();
      setConfirmationTxId(undefined);
    }

    if (!trackerLifecycleKey) {
      return undefined;
    }

    const targetFrom = trackerLifecycleKey;
    // Active-flow closures: capture current values for the effect's lifetime.
    const effectiveTrackedTypes = trackedTypes;
    const effectiveGasTokenAddress = normalizedGasTokenAddress;
    const effectiveExpectedBatchTransactionCount = isSendMode
      ? expectedBatchTransactionCount
      : undefined;

    // Strategy owns batch-tracking state (batch locking + stale filtering).
    const strategyConfig: StrategyConfig = {
      targetFrom,
      isSendMode,
      gasTokenAddress: effectiveGasTokenAddress,
      deferredApprovalRequestId,
      expectedBatchTransactionCount: effectiveExpectedBatchTransactionCount,
    };
    const strategy = createBatchTrackingStrategy(strategyConfig);
    strategyRef.current = strategy;

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

      // Retry sentinel: invalidateBatchStateForRetry reassigns approvalQueue
      // (new array), so identity comparison detects a mid-drain retry without
      // needing the old batchGeneration counter (now owned by the strategy).
      const queueSentinel = trackerState.approvalQueue;
      const isRetryReset = () =>
        trackerStateRef.current.approvalQueue !== queueSentinel;

      let deferredDueToDeviceNotReady = false;
      try {
        while (trackerStateRef.current.approvalQueue.length > 0) {
          if (isRetryReset()) break;
          const maybeRequestId = trackerStateRef.current.approvalQueue.shift();
          if (!maybeRequestId) break;
          const requestId = maybeRequestId;
          let deviceConfirmedReady = false;
          let hasHandledRejection = false;
          let didDispatchCancellationRejection = false;
          let didHandleStxSubmissionFailure = false;

          const handleApprovalRejection = async (): Promise<void> => {
            if (hasHandledRejection) return;
            hasHandledRejection = true;
            if (isRetryReset()) {
              return;
            }

            if (didHandleStxSubmissionFailure) {
              return;
            }

            if (!deviceConfirmedReady) {
              trackerStateRef.current.approvalQueue.unshift(requestId);
              return;
            }

            const signedBatchIdCandidates = [
              requestId,
              getTransactionById(requestId)?.batchId,
            ];
            const isLateSignedBatchRejection = signedBatchIdCandidates.some(
              (batchId) =>
                typeof batchId === 'string' &&
                (trackerStateRef.current.signedBatchIds.has(batchId) ||
                  hasSignedTrackedBatchFromAddress(
                    batchId,
                    targetFrom,
                    trackerStateRef.current.pendingSignTxIds,
                    effectiveTrackedTypes,
                  )),
            );
            if (isLateSignedBatchRejection) {
              return;
            }
            trackerStateRef.current.acceptedApprovalIds.delete(requestId);
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
                // executeHardwareWalletOperation never rethrows execute()
                // errors — onError is the only hook. Return true to suppress
                // the shared HW error sheet; the swaps modal surfaces errors itself.
                if (!(error instanceof Error)) return false;
                const { message } = error;

                // STX submission failures arrive after signing succeeds.
                // handleApprovalRejection would skip them via the late-signed
                // guard, so dispatch the failure here. Don't cancel — txs are
                // already terminal; dropping hides them from activity.
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
            if (isRetryReset()) {
              break;
            }
            if (result) {
              trackerStateRef.current.acceptedApprovalIds.delete(requestId);
            }
            // Device not ready or confirmation dismissed — re-queued via unshift.
            // Exit the drain to avoid tight-looping; reschedule from finally.
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

    const shouldSkipPendingApproval = (requestId: string): boolean => {
      const trackerState = trackerStateRef.current;
      return (
        requestId === deferredApprovalRequestId ||
        trackerState.acceptedApprovalIds.has(requestId)
      );
    };

    const acceptTransactionApproval = (
      requestId: string,
      trackerState: ReturnType<typeof createInitialBatchSignTrackerState>,
    ): void => {
      const txMeta = getTransactions().find(
        (tx: TransactionMeta) => tx.id === requestId,
      );
      if (isSendMode && !txMeta?.batchId) {
        return;
      }
      if (
        !txMeta ||
        !matchesTx(txMeta, targetFrom, effectiveTrackedTypes) ||
        !strategy.isFromCurrentBatch(txMeta.batchId)
      ) {
        return;
      }

      trackerState.acceptedApprovalIds.add(requestId);
      if (txMeta.status === TransactionStatus.approved) {
        trackerState.pendingSignTxIds.add(txMeta.id);
      }
      trackerState.approvalQueue.push(requestId);
    };

    const shouldWaitForBatchReady = (
      batchId: string,
      approvedBatchTransactionIds: string[],
    ): boolean => {
      const expectedApprovedTransactionCount =
        isSendMode && expectedBatchTransactionCount
          ? expectedBatchTransactionCount
          : 1;
      const insufficientApprovals =
        isSendMode &&
        approvedBatchTransactionIds.length < expectedApprovedTransactionCount;
      const hasUnmatchedBatch =
        !hasMatchingBatchTransaction(
          batchId,
          targetFrom,
          effectiveTrackedTypes,
        ) && hasAnyBatchTransaction(batchId);

      return insufficientApprovals || hasUnmatchedBatch;
    };

    const acceptBatchApproval = (
      requestId: string,
      trackerState: ReturnType<typeof createInitialBatchSignTrackerState>,
    ): void => {
      if (
        !strategy.isFromCurrentBatch(requestId) ||
        strategy.isStaleBatch(requestId)
      ) {
        return;
      }

      const approvedBatchTransactionIds = getApprovedBatchTransactionIds(
        requestId,
        targetFrom,
        effectiveTrackedTypes,
      );
      if (shouldWaitForBatchReady(requestId, approvedBatchTransactionIds)) {
        return;
      }

      trackerState.acceptedApprovalIds.add(requestId);
      approvedBatchTransactionIds.forEach((txId) =>
        trackerState.pendingSignTxIds.add(txId),
      );
      trackerState.approvalQueue.push(requestId);
    };

    const enqueuePendingApprovals = () => {
      detectAndApplyRetryGeneration();
      const pendingApprovals = getPendingApprovals();
      const trackerState = trackerStateRef.current;

      for (const [requestId, request] of Object.entries(pendingApprovals)) {
        if (shouldSkipPendingApproval(requestId)) {
          continue;
        }

        if (request.type === ApprovalType.Transaction) {
          acceptTransactionApproval(requestId, trackerState);
          continue;
        }

        if (request.type === ApprovalType.TransactionBatch) {
          acceptBatchApproval(requestId, trackerState);
        }
      }

      processApprovalQueue();
    };
    processApprovalQueueRef.current = processApprovalQueue;

    const dispatchSwapEvent = (event: HardwareWalletsSwapsEvent) => {
      latestValuesRef.current.dispatch(updateHardwareWalletsSwaps(event));
    };

    const shouldIgnoreUnbatchedSend = (
      transactionMeta: TransactionMeta,
    ): boolean =>
      isSendMode &&
      !transactionMeta.batchId &&
      Boolean(effectiveGasTokenAddress) &&
      transactionMeta.id !== deferredApprovalRequestId;

    const completeTrackedTx = (txId: string) => {
      trackerStateRef.current.handledTxIds.add(txId);
      trackerStateRef.current.pendingSignTxIds.delete(txId);
      syncConfirmationTxId();
    };

    // classifyFn closures — flow-specific classification. Strategy gates on
    // batch state, then delegates to these for step-kind/index resolution.

    const resolveStepKind = (
      meta: TransactionMeta,
      txType: TransactionType,
    ): HardwareWalletsSwapsStepKind => {
      if (!isSendMode) return getStepKind(txType);
      if (deferredApprovalRequestId && meta.id === deferredApprovalRequestId)
        return HardwareWalletsSwapsStepKind.Transaction;
      if (txType === TransactionType.gasPayment)
        return HardwareWalletsSwapsStepKind.FeeTransfer;
      return HardwareWalletsSwapsStepKind.Transaction;
    };

    // Maps a transaction to a stable step index for the HW UI progress display.
    // Indices are 0-based. Layout of an N-tx batch:
    //   [0 .. N-2]  regular transactions (assigned in arrival order)
    //   [N-1]       FeeTransfer (gas token payment) — always the LAST step
    const resolveStepIndex = (
      meta: TransactionMeta,
      stepKind: HardwareWalletsSwapsStepKind,
    ): number | undefined => {
      // No indexing outside multi-step send mode (single-step swaps don't use it).
      if (!isSendMode || !effectiveExpectedBatchTransactionCount)
        return undefined;
      // FeeTransfer is always pinned to the final tx of the batch.
      if (stepKind === HardwareWalletsSwapsStepKind.FeeTransfer)
        return effectiveExpectedBatchTransactionCount - 1;
      // Any other non-Transaction kind (e.g. approvals) is not step-indexed.
      if (stepKind !== HardwareWalletsSwapsStepKind.Transaction)
        return undefined;
      const state = trackerStateRef.current;
      // Reuse a previously assigned index so a tx keeps its position across events.
      const existing = state.sendTransactionStepIndexes.get(meta.id);
      if (existing !== undefined) return existing;
      // Next index = number of txs already assigned (auto-increment from 0).
      const next = state.sendTransactionStepIndexes.size;
      // Guard the reserved FeeTransfer slot: if the next index would reach or
      // pass N-1, stop handing out indices rather than collide with the fee step.
      if (next >= effectiveExpectedBatchTransactionCount - 1) return undefined;
      // Persist so subsequent calls for this tx return the same index.
      state.sendTransactionStepIndexes.set(meta.id, next);
      return next;
    };

    const buildPayload = (
      stepKind: HardwareWalletsSwapsStepKind,
      stepIndex?: number,
    ): { stepKind: HardwareWalletsSwapsStepKind; stepIndex?: number } =>
      stepIndex === undefined ? { stepKind } : { stepKind, stepIndex };

    const classifyStatusUpdate: SignedEventClassifier = (meta) => {
      const { status, type } = meta;
      if (!type || !isBatchTransactionType(type, effectiveTrackedTypes))
        return NO_ACTION;
      const stepKind = resolveStepKind(meta, type);
      const state = trackerStateRef.current;
      if (status === TransactionStatus.approved) {
        if (state.signingDispatchedTxIds.has(meta.id)) return NO_ACTION;
        state.signingDispatchedTxIds.add(meta.id);
        state.pendingSignTxIds.add(meta.id);
        return {
          event: {
            type: HardwareWalletsSwapsEventType.Signing,
            payload: buildPayload(stepKind, resolveStepIndex(meta, stepKind)),
          },
          shouldTrackAsPending: true,
          shouldCompleteTracking: false,
          shouldEnqueueApprovals: true,
          shouldTrackCancellation: false,
        };
      }
      if (status === TransactionStatus.signed) {
        if (meta.batchId) state.signedBatchIds.add(meta.batchId);
        return {
          event: {
            type: HardwareWalletsSwapsEventType.Signed,
            payload: buildPayload(stepKind, resolveStepIndex(meta, stepKind)),
          },
          shouldTrackAsPending: false,
          shouldCompleteTracking: true,
          shouldEnqueueApprovals: false,
          shouldTrackCancellation: false,
        };
      }
      if (status === TransactionStatus.confirmed)
        return { ...NO_ACTION, shouldCompleteTracking: true };
      if (status === TransactionStatus.dropped)
        return {
          event: {
            type: HardwareWalletsSwapsEventType.Rejected,
            payload: buildPayload(stepKind, resolveStepIndex(meta, stepKind)),
          },
          shouldTrackAsPending: false,
          shouldCompleteTracking: true,
          shouldEnqueueApprovals: false,
          shouldTrackCancellation: true,
        };
      return NO_ACTION;
    };

    const classifyRejected: SignedEventClassifier = (meta) => {
      const { type } = meta;
      if (!type || !isBatchTransactionType(type, effectiveTrackedTypes))
        return NO_ACTION;
      const stepKind = resolveStepKind(meta, type);
      return {
        event: {
          type: HardwareWalletsSwapsEventType.Rejected,
          payload: buildPayload(stepKind, resolveStepIndex(meta, stepKind)),
        },
        shouldTrackAsPending: false,
        shouldCompleteTracking: true,
        shouldEnqueueApprovals: false,
        shouldTrackCancellation: true,
      };
    };

    const classifyFinished: SignedEventClassifier = (meta) => {
      if (meta.status === TransactionStatus.failed)
        return {
          event: { type: HardwareWalletsSwapsEventType.TransactionFailed },
          shouldTrackAsPending: false,
          shouldCompleteTracking: true,
          shouldEnqueueApprovals: false,
          shouldTrackCancellation: false,
        };
      return classifyStatusUpdate(meta);
    };

    // Event handlers — delegate to strategy for batch filtering/locking and
    // classification. The hook applies side effects (dispatch, state updates).

    const applyResult = (
      result: StrategyEventResult,
      meta: TransactionMeta,
    ) => {
      if (result.event) dispatchSwapEvent(result.event);
      if (result.shouldTrackAsPending) setConfirmationTxId(meta.id);
      if (result.shouldCompleteTracking) completeTrackedTx(meta.id);
      if (result.shouldEnqueueApprovals) enqueuePendingApprovals();
      if (result.shouldTrackCancellation) trackTransactionCancelledEvent();
    };

    const handleStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom, effectiveTrackedTypes))
        return;
      if (shouldIgnoreUnbatchedSend(transactionMeta)) return;
      detectAndApplyRetryGeneration();
      if (trackerStateRef.current.pendingAbortTxIds.has(transactionMeta.id)) {
        trackerStateRef.current.pendingAbortTxIds.delete(transactionMeta.id);
        return;
      }
      // Dedup: skip terminal events for already-handled txs
      if (
        (transactionMeta.status === TransactionStatus.signed ||
          transactionMeta.status === TransactionStatus.confirmed ||
          transactionMeta.status === TransactionStatus.dropped) &&
        trackerStateRef.current.handledTxIds.has(transactionMeta.id)
      ) {
        return;
      }
      applyResult(
        strategy.processStatusUpdated(transactionMeta, classifyStatusUpdate),
        transactionMeta,
      );
    };

    const handleFinalized = (
      transactionMeta: TransactionMeta,
      handleStep: (
        meta: TransactionMeta,
        classifier: SignedEventClassifier,
      ) => StrategyEventResult,
      classifier: SignedEventClassifier,
    ) => {
      if (shouldIgnoreUnbatchedSend(transactionMeta)) return;
      if (trackerStateRef.current.handledTxIds.has(transactionMeta.id)) return;
      if (trackerStateRef.current.pendingAbortTxIds.has(transactionMeta.id)) {
        trackerStateRef.current.pendingAbortTxIds.delete(transactionMeta.id);
        return;
      }
      detectAndApplyRetryGeneration();
      applyResult(handleStep(transactionMeta, classifier), transactionMeta);
    };

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      handleFinalized(
        transactionMeta,
        strategy.processRejected,
        classifyRejected,
      );
    };

    const handleFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      handleFinalized(
        transactionMeta,
        strategy.processFinished,
        classifyFinished,
      );
    };

    const handleFinished = (transactionMeta: TransactionMeta) => {
      if (!matchesTx(transactionMeta, targetFrom, effectiveTrackedTypes))
        return;
      handleFinalized(
        transactionMeta,
        strategy.processFinished,
        classifyFinished,
      );
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
      'TransactionController:transactionFinished',
      handleFinished,
    );
    Engine.controllerMessenger.subscribe(
      'ApprovalController:stateChange',
      enqueuePendingApprovals,
    );
    enqueuePendingApprovals();

    return () => {
      clearDeferredApprovalQueueRetry();
      processApprovalQueueRef.current = undefined;
      strategyRef.current = undefined;
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
        'TransactionController:transactionFinished',
        handleFinished,
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
    isCancelledError,
    isEnabled,
    normalizedGasTokenAddress,
    retryGenerationRef,
    isSendMode,
    syncConfirmationTxId,
    trackTransactionCancelledEvent,
    trackedTypes,
    deferredApprovalRequestId,
    expectedBatchTransactionCount,
  ]);

  return { cancelCurrentBatch, confirmationTxId };
}
