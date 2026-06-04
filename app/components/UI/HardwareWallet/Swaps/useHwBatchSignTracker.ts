import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
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

function isBatchTransactionType(
  txType: TransactionMeta['type'],
): txType is TransactionType {
  return Boolean(txType && ALL_BATCH_TYPES.has(txType));
}

function matchesTx(
  transactionMeta: TransactionMeta,
  targetFrom: string,
): boolean {
  const normalizedFrom = transactionMeta.txParams.from?.toLowerCase();
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

function getCancellableBatchTxIds(
  address: string | undefined,
  trackedTxIds: Iterable<string>,
): string[] {
  const nonTerminalTxIds = address
    ? getTransactions()
        .filter(
          (tx: TransactionMeta) =>
            tx.txParams.from?.toLowerCase() === address &&
            NON_TERMINAL_CANCEL_STATUSES.has(tx.status) &&
            isBatchTransactionType(tx.type),
        )
        .map((tx: TransactionMeta) => tx.id)
    : [];

  return [...new Set([...trackedTxIds, ...nonTerminalTxIds])];
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
  const pendingApprovals =
    Engine.context.ApprovalController.state.pendingApprovals ?? {};
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

    Engine.rejectPendingApproval(requestId, new Error('Batch cancelled'), {
      ignoreMissing: true,
      logErrors: false,
    });
    hadPendingApprovals = true;
  }

  return hadPendingApprovals;
}

function getFailedBatchTxChainIds(
  address: string | undefined,
): Set<NonNullable<TransactionMeta['chainId']>> {
  const failedBatchTxs = address
    ? getTransactions().filter(
        (tx: TransactionMeta) =>
          tx.txParams.from?.toLowerCase() === address &&
          FAILED_OR_REJECTED_STATUSES.has(tx.status) &&
          isBatchTransactionType(tx.type),
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

function wipeFailedBatchTransactions(address: string | undefined): void {
  if (!address) return;

  for (const chainId of getFailedBatchTxChainIds(address)) {
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
    try {
      Engine.context.TransactionController.abortTransactionSigning(txId);
    } catch {
      pendingAbortTxIds.delete(txId);
    }
  }
}

function dropAbortableTransactions(txIds: string[]): void {
  for (const txId of txIds) {
    const tx = getTransactionById(txId);
    if (!tx || !NON_TERMINAL_CANCEL_STATUSES.has(tx.status)) {
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

function hasPendingTransactions(txIds: string[]): boolean {
  return txIds.some((id) => {
    const tx = getTransactionById(id);
    return tx && !TERMINAL_CANCEL_STATUSES.has(tx.status);
  });
}

function waitForTerminalTransactions(txIds: string[]): Promise<void> {
  if (!hasPendingTransactions(txIds)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const remaining = new Set(txIds);
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

    timeoutRef.current = setTimeout(finish, 5_000);

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

  if (request.type === 'transaction') {
    const txMeta = Engine.context.TransactionController.state.transactions.find(
      (tx: TransactionMeta) => tx.id === requestId,
    );
    return Boolean(txMeta && matchesTx(txMeta, targetFrom));
  }

  if (request.type === 'transaction_batch') {
    if (relatedBatchIds.has(requestId) || relatedApprovalIds.has(requestId)) {
      return true;
    }

    return Engine.context.TransactionController.state.transactions.some(
      (tx: TransactionMeta) =>
        tx.batchId === requestId && matchesTx(tx, targetFrom),
    );
  }

  return false;
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
  trackedTxIds: Set<string>;
  pendingAbortTxIds: Set<string>;
  acceptedApprovalIds: Set<string>;
  approvalQueue: string[];
  isProcessingQueue: boolean;
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
    trackedTxIds: new Set(),
    pendingAbortTxIds: new Set(),
    acceptedApprovalIds: new Set(),
    approvalQueue: [],
    isProcessingQueue: false,
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
  const [confirmationTxId, setConfirmationTxId] = useState<
    string | undefined
  >();

  const invalidateBatchStateForRetry = useCallback(() => {
    const trackerState = trackerStateRef.current;
    trackerState.acceptedApprovalIds = new Set();
    trackerState.approvalQueue = [];
    trackerState.batchGeneration += 1;

    for (const id of trackerState.seenBatchIds) {
      trackerState.staleBatchIds.add(id);
    }
    trackerState.seenBatchIds = new Set();
    trackerState.currentBatchId = null;
    setConfirmationTxId(undefined);
  }, []);

  const checkGeneration = useCallback(() => {
    const trackerState = trackerStateRef.current;
    if (
      retryGenerationRef &&
      retryGenerationRef.current !== trackerState.lastSeenGeneration
    ) {
      trackerState.lastSeenGeneration = retryGenerationRef.current;
      invalidateBatchStateForRetry();
    }
  }, [retryGenerationRef, invalidateBatchStateForRetry]);

  const syncConfirmationTxId = useCallback(() => {
    setConfirmationTxId((current) => {
      const { trackedTxIds } = trackerStateRef.current;
      if (trackedTxIds.size === 0) {
        return undefined;
      }
      if (current && trackedTxIds.has(current)) {
        return current;
      }
      return trackedTxIds.values().next().value;
    });
  }, []);

  const isFromCurrentBatch = useCallback(
    (transactionMeta: TransactionMeta): boolean => {
      const { currentBatchId, staleBatchIds } = trackerStateRef.current;
      if (currentBatchId === undefined) return true;
      if (currentBatchId === null) {
        const batchId = transactionMeta.batchId;
        return batchId ? !staleBatchIds.has(batchId) : true;
      }
      return transactionMeta.batchId === currentBatchId;
    },
    [],
  );

  const isCancelledError = useCallback((error: unknown): boolean => {
    const message =
      error instanceof Error ? error.message : String(error ?? '');
    return (
      message.startsWith(KEYSTONE_TX_CANCELED) ||
      message.startsWith(STX_NO_HASH_ERROR)
    );
  }, []);

  const trackTransactionCancelledEvent = useCallback(() => {
    const { trackEvent: latestTrackEvent, createEventBuilder: latestBuilder } =
      latestValuesRef.current;
    latestTrackEvent(
      latestBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED).build(),
    );
  }, []);

  const cancelCurrentBatch = useCallback(async () => {
    const trackerState = trackerStateRef.current;
    const address = latestValuesRef.current.fromAddress?.toLowerCase();
    const allTxIds = getCancellableBatchTxIds(
      address,
      trackerState.trackedTxIds,
    );
    const relatedBatchIds = getRelatedBatchIds(
      trackerState.currentBatchId,
      trackerState.seenBatchIds,
      allTxIds,
    );

    const relatedApprovalIds = new Set([
      ...trackerState.acceptedApprovalIds,
      ...trackerState.approvalQueue,
    ]);

    trackerState.trackedTxIds = new Set();
    trackerState.signedBatchIds = new Set();
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
    // so scan all TC transactions for failed/rejected bridge txs from this
    // address. If we leave these metas in TC state holding nonces N and N+1,
    // TC may assign nonces N+2 and N+3 to the retry batch, creating a nonce
    // gap that STX's simulator rejects with would_revert.
    //
    // TransactionController only exposes a typed chain/address-scoped wipe
    // action, not a single-transaction delete action. Skip missing chain IDs
    // rather than widening to every chain for the address.
    wipeFailedBatchTransactions(address);

    if (allTxIds.length === 0) {
      return;
    }

    trackerState.pendingAbortTxIds = new Set(allTxIds);

    abortTransactionSignings(allTxIds, trackerState.pendingAbortTxIds);

    // abortTransactionSigning may not work on signed txs — fail them explicitly
    dropAbortableTransactions(allTxIds);
    await waitForTerminalTransactions(allTxIds);
  }, [invalidateBatchStateForRetry, trackTransactionCancelledEvent]);

  useEffect(() => {
    if (!fromAddress || !isEnabled) {
      return undefined;
    }

    const targetFrom = fromAddress.toLowerCase();
    const handledTxIds = new Set<string>();

    const processApprovalQueue = async () => {
      checkGeneration();
      const trackerState = trackerStateRef.current;
      if (trackerState.isProcessingQueue) return;
      trackerState.isProcessingQueue = true;

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

          const handleApprovalRejection = async (): Promise<void> => {
            if (hasHandledRejection) return;
            hasHandledRejection = true;
            if (trackerState.batchGeneration !== myGeneration) {
              return;
            }

            if (!deviceConfirmedReady) {
              trackerState.approvalQueue.unshift(requestId);
              return;
            }

            const isLateSignedBatchRejection =
              trackerState.currentBatchId != null &&
              trackerState.signedBatchIds.has(trackerState.currentBatchId);
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
            latestValuesRef.current.dispatch(
              updateHardwareWalletsSwaps({
                type: HardwareWalletsSwapsEventType.TransactionFailed,
              }),
            );
            await cancelCurrentBatch();
          };

          try {
            const latestValues = latestValuesRef.current;
            const result = await executeHardwareWalletOperation({
              address: fromAddress,
              operationType: 'transaction',
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

                // STX submission failures arrive AFTER signing has succeeded.
                // handleApprovalRejection (onRejected) would skip them via its
                // "late signed batch rejection" guard, so dispatch the failure
                // here. Don't call cancelCurrentBatch — by this point the txs
                // are already in their terminal failed state from the STX
                // backend; dropping them would hide them from the activity
                // list.
                const isStxSubmissionFailure =
                  error.message.startsWith(STX_NO_HASH_ERROR);
                if (isStxSubmissionFailure) {
                  latestValuesRef.current.dispatch(
                    updateHardwareWalletsSwaps({
                      type: HardwareWalletsSwapsEventType.TransactionFailed,
                    }),
                  );
                }

                return (
                  isStxSubmissionFailure ||
                  error.message.startsWith(KEYSTONE_TX_CANCELED) ||
                  error.message === 'Batch cancelled'
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
        if (trackerStateRef.current.approvalQueue.length > 0) {
          Promise.resolve().then(processApprovalQueue);
        }
      }
    };

    const enqueuePendingApprovals = () => {
      checkGeneration();
      const { ApprovalController } = Engine.context;
      const pendingApprovals = ApprovalController.state.pendingApprovals ?? {};

      for (const [requestId, request] of Object.entries(pendingApprovals)) {
        const trackerState = trackerStateRef.current;
        if (trackerState.acceptedApprovalIds.has(requestId)) {
          continue;
        }

        if (request.type === 'transaction') {
          const txMeta =
            Engine.context.TransactionController.state.transactions.find(
              (tx: TransactionMeta) => tx.id === requestId,
            );
          if (txMeta && matchesTx(txMeta, targetFrom)) {
            trackerState.acceptedApprovalIds.add(requestId);
            trackerState.approvalQueue.push(requestId);
          }
        } else if (request.type === 'transaction_batch') {
          trackerState.acceptedApprovalIds.add(requestId);
          trackerState.approvalQueue.push(requestId);
        }
      }

      processApprovalQueue();
    };

    const dispatchSwapEvent = (event: HardwareWalletsSwapsEvent) => {
      latestValuesRef.current.dispatch(updateHardwareWalletsSwaps(event));
    };

    const completeTrackedTx = (txId: string) => {
      handledTxIds.add(txId);
      trackerStateRef.current.trackedTxIds.delete(txId);
      syncConfirmationTxId();
    };

    const shouldIgnoreTerminalTx = (transactionMeta: TransactionMeta) => {
      if (!matchesTx(transactionMeta, targetFrom)) return true;

      checkGeneration();

      if (handledTxIds.has(transactionMeta.id)) return true;
      if (!isFromCurrentBatch(transactionMeta)) return true;
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

      checkGeneration();

      const { status } = transactionMeta;
      const type = transactionMeta.type;
      if (!isBatchTransactionType(type)) return;
      const stepKind = getStepKind(type);

      if (status === TransactionStatus.approved) {
        if (!isFromCurrentBatch(transactionMeta)) {
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
        trackerStateRef.current.trackedTxIds.add(transactionMeta.id);
        setConfirmationTxId(transactionMeta.id);
        dispatchSwapEvent({
          type: HardwareWalletsSwapsEventType.Signing,
          payload: { stepKind },
        });
      } else if (status === TransactionStatus.signed) {
        if (!isFromCurrentBatch(transactionMeta)) {
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
      }
    };

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (shouldIgnoreTerminalTx(transactionMeta)) return;

      const type = transactionMeta.type;
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

    return () => {
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
    checkGeneration,
    fromAddress,
    isCancelledError,
    isEnabled,
    isFromCurrentBatch,
    syncConfirmationTxId,
    trackTransactionCancelledEvent,
  ]);

  return { cancelCurrentBatch, confirmationTxId };
}
