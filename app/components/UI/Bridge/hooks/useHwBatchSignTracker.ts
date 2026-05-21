import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useDispatch } from 'react-redux';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import Engine from '../../../../core/Engine';
import {
  executeHardwareWalletOperation,
  useHardwareWallet,
} from '../../../../core/HardwareWallet';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStepKind,
  HardwareWalletsSwapsEventType,
} from '../../HardwareWallet/Swaps/HardwareWalletsSwaps.state';
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

function matchesTx(
  transactionMeta: TransactionMeta,
  targetFrom: string,
): boolean {
  const normalizedFrom = transactionMeta.txParams.from?.toLowerCase();
  if (normalizedFrom !== targetFrom) return false;
  return ALL_BATCH_TYPES.has(transactionMeta.type as TransactionType);
}

function getStepKind(txType: TransactionType): HardwareWalletsSwapsStepKind {
  return APPROVAL_TYPES.has(txType)
    ? HardwareWalletsSwapsStepKind.Approval
    : HardwareWalletsSwapsStepKind.Transaction;
}

interface UseHwBatchSignTrackerOptions {
  fromAddress: string | undefined;
  isEnabled: boolean;
  retryGenerationRef?: React.RefObject<number>;
}

export function useHwBatchSignTracker({
  fromAddress,
  isEnabled,
  retryGenerationRef,
}: UseHwBatchSignTrackerOptions) {
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const {
    walletType,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();
  const isQrWallet = walletType === HardwareWalletType.Qr;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const trackEventRef = useRef(trackEvent);
  trackEventRef.current = trackEvent;
  const createEventBuilderRef = useRef(createEventBuilder);
  createEventBuilderRef.current = createEventBuilder;
  const hardwareWalletOperationRef = useRef({
    isQrWallet,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  });
  hardwareWalletOperationRef.current = {
    isQrWallet,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  };

  const fromAddressRef = useRef(fromAddress);
  fromAddressRef.current = fromAddress;

  const currentBatchIdRef = useRef<string | null | undefined>(undefined);
  const seenBatchIdsRef = useRef<Set<string>>(new Set());
  const staleBatchIdsRef = useRef<Set<string>>(new Set());
  const signedBatchIdsRef = useRef<Set<string>>(new Set());
  const trackedTxIdsRef = useRef<Set<string>>(new Set());
  const pendingAbortTxIdsRef = useRef<Set<string>>(new Set());
  const acceptedApprovalIdsRef = useRef<Set<string>>(new Set());
  const approvalQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const batchGenerationRef = useRef(0);
  const lastSeenGenerationRef = useRef(retryGenerationRef?.current ?? 0);

  const checkGeneration = useCallback(() => {
    if (
      retryGenerationRef &&
      retryGenerationRef.current !== lastSeenGenerationRef.current
    ) {
      lastSeenGenerationRef.current = retryGenerationRef.current;
      // Mark all previously-seen batch IDs as stale
      for (const id of seenBatchIdsRef.current) {
        staleBatchIdsRef.current.add(id);
      }
      seenBatchIdsRef.current = new Set();
      currentBatchIdRef.current = null;
    }
  }, [retryGenerationRef]);
  const [confirmationTxId, setConfirmationTxId] = useState<
    string | undefined
  >();

  const isFromCurrentBatch = useCallback(
    (transactionMeta: TransactionMeta): boolean => {
      if (currentBatchIdRef.current === undefined) return true;
      if (currentBatchIdRef.current === null) {
        const batchId = transactionMeta.batchId;
        return batchId ? !staleBatchIdsRef.current.has(batchId) : true;
      }
      return transactionMeta.batchId === currentBatchIdRef.current;
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
    trackEventRef.current(
      createEventBuilderRef
        .current(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED)
        .build(),
    );
  }, []);

  const cancelCurrentBatch = useCallback(async () => {
    const txIds = [...trackedTxIdsRef.current];
    const address = fromAddressRef.current?.toLowerCase();

    const nonTerminalStatuses = new Set([
      TransactionStatus.approved,
      TransactionStatus.signed,
      TransactionStatus.submitted,
    ]);

    const allNonTerminalTxIds = address
      ? Engine.context.TransactionController.state.transactions
          .filter((tx: TransactionMeta) => {
            if (tx.txParams.from?.toLowerCase() !== address) return false;
            if (!nonTerminalStatuses.has(tx.status)) return false;
            if (!ALL_BATCH_TYPES.has(tx.type as TransactionType)) return false;
            return true;
          })
          .map((tx: TransactionMeta) => tx.id)
      : [];

    const allTxIds = [...new Set([...txIds, ...allNonTerminalTxIds])];

    Logger.log(
      '[HW-BatchSign] cancelCurrentBatch — aborting tracked txs:',
      txIds,
      'non-terminal txs:',
      allNonTerminalTxIds,
      'all:',
      allTxIds,
    );
    trackedTxIdsRef.current = new Set();
    signedBatchIdsRef.current = new Set();
    acceptedApprovalIdsRef.current = new Set();
    approvalQueueRef.current = [];
    batchGenerationRef.current += 1;

    /**
     * Mark all previously-seen batch IDs as stale so that events from the
     * old batch are correctly rejected while events from the retry batch
     * (which will have a new batch ID) pass through isFromCurrentBatch.
     *
     * Without this, isFromCurrentBatch unconditionally rejects events when
     * currentBatchIdRef === null, blocking retry batches that lack a batchId.
     */
    for (const id of seenBatchIdsRef.current) {
      staleBatchIdsRef.current.add(id);
    }
    seenBatchIdsRef.current = new Set();
    currentBatchIdRef.current = null;
    setConfirmationTxId(undefined);

    const pendingApprovals =
      Engine.context.ApprovalController.state.pendingApprovals ?? {};
    let hadPendingApprovals = false;
    for (const [requestId, request] of Object.entries(pendingApprovals)) {
      if (
        request.type === 'transaction_batch' ||
        request.type === 'transaction'
      ) {
        Logger.log(
          '[HW-BatchSign] cancelCurrentBatch — rejecting pending approval',
          { requestId, type: request.type },
        );
        Engine.rejectPendingApproval(requestId, new Error('Batch cancelled'), {
          ignoreMissing: true,
          logErrors: false,
        });
        hadPendingApprovals = true;
      }
    }

    if (hadPendingApprovals) {
      trackTransactionCancelledEvent();
    }

    if (allTxIds.length === 0) {
      isProcessingQueueRef.current = false;
      return;
    }

    pendingAbortTxIdsRef.current = new Set(allTxIds);

    await Promise.allSettled(
      allTxIds.map((txId) => {
        try {
          Engine.context.TransactionController.abortTransactionSigning(txId);
          return undefined;
        } catch {
          pendingAbortTxIdsRef.current.delete(txId);
          return undefined;
        }
      }),
    );

    // abortTransactionSigning may not work on signed txs — fail them explicitly
    for (const txId of allTxIds) {
      const tx = Engine.context.TransactionController.state.transactions.find(
        (t) => t.id === txId,
      );
      if (
        tx &&
        (tx.status === TransactionStatus.signed ||
          tx.status === TransactionStatus.submitted ||
          tx.status === TransactionStatus.approved)
      ) {
        Logger.log(
          '[HW-BatchSign] cancelCurrentBatch — explicitly failing tx:',
          txId,
          tx.status,
        );
        try {
          Engine.controllerMessenger.call(
            'TransactionController:updateTransaction',
            { ...tx, status: TransactionStatus.dropped },
            'HW batch cancelled — dropping signed tx',
          );
        } catch (e) {
          Logger.log(
            '[HW-BatchSign] cancelCurrentBatch — failed to fail tx:',
            txId,
            e,
          );
        }
      }
    }

    // Wipe rejected/failed bridge txs so their nonces don't block retry
    // batches. We can't rely on txIds (already cleared by failure handler),
    // so scan all TC transactions for failed/rejected bridge txs from this
    // address. If we leave these metas in TC state holding nonces N and N+1,
    // TC may assign nonces N+2 and N+3 to the retry batch, creating a nonce
    // gap that STX's simulator rejects with would_revert.
    const allFailedBridgeTxs = address
      ? Engine.context.TransactionController.state.transactions.filter(
          (tx: TransactionMeta) => {
            if (tx.txParams.from?.toLowerCase() !== address) return false;
            if (
              tx.status !== TransactionStatus.rejected &&
              tx.status !== TransactionStatus.failed
            )
              return false;
            return ALL_BATCH_TYPES.has(tx.type as TransactionType);
          },
        )
      : [];

    Logger.log(
      '[HW-BatchSign] cancelCurrentBatch — wiping failed/rejected txs:',
      allFailedBridgeTxs.map((tx) => ({ id: tx.id, status: tx.status })),
    );

    for (const tx of allFailedBridgeTxs) {
      try {
        Engine.controllerMessenger.call(
          'TransactionController:wipeTransaction',
          tx.id,
        );
      } catch (e) {
        Logger.log(
          '[HW-BatchSign] cancelCurrentBatch — failed to wipe tx:',
          tx.id,
          e,
        );
      }
    }

    const terminalStatuses = new Set([
      TransactionStatus.failed,
      TransactionStatus.rejected,
      TransactionStatus.submitted,
      TransactionStatus.confirmed,
      TransactionStatus.dropped,
    ]);

    const stillPending = (ids: string[]) =>
      ids.some((id) => {
        const tx = Engine.context.TransactionController.state.transactions.find(
          (t) => t.id === id,
        );
        return tx && !terminalStatuses.has(tx.status);
      });

    if (stillPending(allTxIds)) {
      await Promise.race([
        new Promise<void>((resolve) => {
          const remaining = new Set(allTxIds);

          const handler = ({
            transactionMeta,
          }: {
            transactionMeta: { id: string; status: TransactionStatus };
          }) => {
            if (
              remaining.has(transactionMeta.id) &&
              terminalStatuses.has(transactionMeta.status)
            ) {
              remaining.delete(transactionMeta.id);
              if (remaining.size === 0) {
                Engine.controllerMessenger.unsubscribe(
                  'TransactionController:transactionStatusUpdated',
                  handler,
                );
                resolve();
              }
            }
          };

          Engine.controllerMessenger.subscribe(
            'TransactionController:transactionStatusUpdated',
            handler,
          );

          if (!stillPending(allTxIds)) {
            Engine.controllerMessenger.unsubscribe(
              'TransactionController:transactionStatusUpdated',
              handler,
            );
            resolve();
          }
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ]);
    }

    isProcessingQueueRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!fromAddress || !isEnabled) {
      return undefined;
    }

    const targetFrom = fromAddress.toLowerCase();
    const handledTxIds = new Set<string>();

    const isProcessingQueue = () => isProcessingQueueRef.current;
    const setProcessingQueue = (val: boolean) => {
      isProcessingQueueRef.current = val;
    };

    const processApprovalQueue = async () => {
      if (isProcessingQueue()) return;
      setProcessingQueue(true);

      try {
        const myGeneration = batchGenerationRef.current;
        const queue = approvalQueueRef.current;
        while (queue.length > 0) {
          if (batchGenerationRef.current !== myGeneration) break;
          const maybeRequestId = queue.shift();
          if (!maybeRequestId) break;
          const requestId = maybeRequestId;
          let deviceConfirmedReady = false;
          let hasHandledRejection = false;

          const handleApprovalRejection = (): void => {
            if (hasHandledRejection) return;
            hasHandledRejection = true;
            if (batchGenerationRef.current !== myGeneration) {
              Logger.log('[HW-BatchSign] Stale batch rejection — ignoring', {
                requestId,
              });
              return;
            }

            if (!deviceConfirmedReady) {
              Logger.log(
                '[HW-BatchSign] Device not ready — re-queueing for automatic retry',
                { requestId },
              );
              approvalQueueRef.current.unshift(requestId);
              return;
            }

            const isLateSignedBatchRejection =
              currentBatchIdRef.current != null &&
              signedBatchIdsRef.current.has(currentBatchIdRef.current);
            if (isLateSignedBatchRejection) {
              Logger.log(
                '[HW-BatchSign] Skipping rejection — late signed batch rejection',
                { requestId },
              );
              return;
            }
            Logger.log('[HW-BatchSign] Rejecting approval and cleaning up', {
              requestId,
            });
            acceptedApprovalIdsRef.current.delete(requestId);
            Engine.rejectPendingApproval(
              requestId,
              new Error('User rejected the transaction'),
              { ignoreMissing: true, logErrors: false },
            );
            trackTransactionCancelledEvent();
            dispatchRef.current(
              updateHardwareWalletsSwaps({
                type: HardwareWalletsSwapsEventType.TransactionFailed,
              }),
            );
            cancelCurrentBatch();
          };

          try {
            const hardwareWalletOperation = hardwareWalletOperationRef.current;
            const isQr = hardwareWalletOperation.isQrWallet;

            const result = await executeHardwareWalletOperation({
              address: fromAddress,
              operationType: 'transaction',
              ensureDeviceReady: hardwareWalletOperation.ensureDeviceReady,
              setPendingOperationAddress:
                hardwareWalletOperation.setPendingOperationAddress,
              showAwaitingConfirmation:
                hardwareWalletOperation.showAwaitingConfirmation,
              hideAwaitingConfirmation:
                hardwareWalletOperation.hideAwaitingConfirmation,
              showHardwareWalletError:
                hardwareWalletOperation.showHardwareWalletError,
              showConfirmation: !isQr,
              execute: async () => {
                deviceConfirmedReady = true;
                Logger.log(
                  '[HW-BatchSign] Executing ApprovalController.acceptRequest',
                  { requestId },
                );
                await Engine.context.ApprovalController.acceptRequest(
                  requestId,
                  undefined,
                  { waitForResult: true },
                );
                Logger.log(
                  '[HW-BatchSign] ApprovalController.acceptRequest completed',
                  { requestId },
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
                  dispatchRef.current(
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
            if (result) {
              acceptedApprovalIdsRef.current.delete(requestId);
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
            handleApprovalRejection();
          }
        }
      } finally {
        setProcessingQueue(false);
        if (approvalQueueRef.current.length > 0) {
          processApprovalQueue();
        }
      }
    };

    const enqueuePendingApprovals = () => {
      const { ApprovalController } = Engine.context;
      const pendingApprovals = ApprovalController.state.pendingApprovals ?? {};
      Logger.log(
        '[HW-BatchSign] enqueuePendingApprovals — count:',
        Object.keys(pendingApprovals).length,
      );

      for (const [requestId, request] of Object.entries(pendingApprovals)) {
        if (acceptedApprovalIdsRef.current.has(requestId)) {
          continue;
        }

        if (request.type === 'transaction') {
          const txMeta =
            Engine.context.TransactionController.state.transactions.find(
              (tx: TransactionMeta) => tx.id === requestId,
            );
          if (txMeta && matchesTx(txMeta, targetFrom)) {
            Logger.log(
              '[HW-BatchSign] Enqueuing pending transaction approval',
              { requestId, txType: txMeta.type },
            );
            acceptedApprovalIdsRef.current.add(requestId);
            approvalQueueRef.current.push(requestId);
          }
        } else if (request.type === 'transaction_batch') {
          Logger.log(
            '[HW-BatchSign] Enqueuing pending transaction_batch approval',
            { requestId },
          );
          acceptedApprovalIdsRef.current.add(requestId);
          approvalQueueRef.current.push(requestId);
        }
      }

      processApprovalQueue();
    };

    const handleStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;

      checkGeneration();

      const { status, type } = transactionMeta;
      const stepKind = getStepKind(type as TransactionType);
      Logger.log('[HW-BatchSign] transactionStatusUpdated', {
        txId: transactionMeta.id,
        status,
        type,
        stepKind,
        batchId: transactionMeta.batchId,
      });

      if (status === TransactionStatus.approved) {
        Logger.log(
          '[HW-BatchSign] Transaction approved — dispatching SIGNING',
          { txId: transactionMeta.id, stepKind },
        );
        if (transactionMeta.batchId) {
          seenBatchIdsRef.current.add(transactionMeta.batchId);
          if (
            !currentBatchIdRef.current &&
            !staleBatchIdsRef.current.has(transactionMeta.batchId)
          ) {
            currentBatchIdRef.current = transactionMeta.batchId;
            Logger.log(
              '[HW-BatchSign] Set currentBatchId',
              transactionMeta.batchId,
            );
          }
        }
        trackedTxIdsRef.current.add(transactionMeta.id);
        setConfirmationTxId(transactionMeta.id);
        dispatchRef.current(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Signing,
            payload: { stepKind },
          }),
        );
      } else if (status === TransactionStatus.signed) {
        if (!isFromCurrentBatch(transactionMeta)) {
          Logger.log(
            '[HW-BatchSign] Signed tx not from current batch — ignoring',
            { txId: transactionMeta.id, batchId: transactionMeta.batchId },
          );
          return;
        }
        Logger.log('[HW-BatchSign] Transaction signed — dispatching SIGNED', {
          txId: transactionMeta.id,
          stepKind,
        });
        if (transactionMeta.batchId) {
          signedBatchIdsRef.current.add(transactionMeta.batchId);
        }
        dispatchRef.current(
          updateHardwareWalletsSwaps({
            type: HardwareWalletsSwapsEventType.Signed,
            payload: { stepKind },
          }),
        );
        handledTxIds.add(transactionMeta.id);
        trackedTxIdsRef.current.delete(transactionMeta.id);
        if (trackedTxIdsRef.current.size === 0) {
          Logger.log(
            '[HW-BatchSign] All tracked txs resolved — clearing confirmationTxId',
          );
          setConfirmationTxId(undefined);
        }
      }
    };

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;

      checkGeneration();

      if (handledTxIds.has(transactionMeta.id)) return;
      if (!isFromCurrentBatch(transactionMeta)) {
        return;
      }
      if (pendingAbortTxIdsRef.current.has(transactionMeta.id)) {
        pendingAbortTxIdsRef.current.delete(transactionMeta.id);
        Logger.log(
          '[HW-BatchSign] transactionRejected for aborted tx — ignoring',
          { txId: transactionMeta.id },
        );
        return;
      }

      const stepKind = getStepKind(transactionMeta.type as TransactionType);
      Logger.log('[HW-BatchSign] transactionRejected — dispatching REJECTED', {
        txId: transactionMeta.id,
        stepKind,
      });
      trackTransactionCancelledEvent();
      dispatchRef.current(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Rejected,
          payload: { stepKind },
        }),
      );
      handledTxIds.add(transactionMeta.id);
      trackedTxIdsRef.current.delete(transactionMeta.id);
      if (trackedTxIdsRef.current.size === 0) {
        setConfirmationTxId(undefined);
      }
    };

    const handleFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;

      checkGeneration();

      if (handledTxIds.has(transactionMeta.id)) return;
      if (!isFromCurrentBatch(transactionMeta)) {
        return;
      }
      if (pendingAbortTxIdsRef.current.has(transactionMeta.id)) {
        pendingAbortTxIdsRef.current.delete(transactionMeta.id);
        Logger.log(
          '[HW-BatchSign] transactionFailed for aborted tx — ignoring',
          { txId: transactionMeta.id },
        );
        return;
      }

      Logger.log(
        '[HW-BatchSign] transactionFailed — dispatching TRANSACTION_FAILED',
        { txId: transactionMeta.id },
      );
      dispatchRef.current(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      handledTxIds.add(transactionMeta.id);
      trackedTxIdsRef.current.delete(transactionMeta.id);
      if (trackedTxIdsRef.current.size === 0) {
        setConfirmationTxId(undefined);
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
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
        'TransactionController:transactionStatusUpdated',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromAddress, isEnabled, isFromCurrentBatch]);

  return { cancelCurrentBatch, confirmationTxId };
}
