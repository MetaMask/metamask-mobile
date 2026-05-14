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
import { HardwareWalletsSwapsStepKind, HardwareWalletsSwapsEventType } from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

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
}

export function useHwBatchSignTracker({
  fromAddress,
  isEnabled,
}: UseHwBatchSignTrackerOptions) {
  const dispatch = useDispatch();
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const hardwareWalletOperationRef = useRef({
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  });
  hardwareWalletOperationRef.current = {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  };

  const currentBatchIdRef = useRef<string | null | undefined>(undefined);
  const seenBatchIdsRef = useRef<Set<string>>(new Set());
  const signedBatchIdsRef = useRef<Set<string>>(new Set());
  const trackedTxIdsRef = useRef<Set<string>>(new Set());
  const pendingAbortTxIdsRef = useRef<Set<string>>(new Set());
  const acceptedApprovalIdsRef = useRef<Set<string>>(new Set());
  const approvalQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const batchGenerationRef = useRef(0);
  const [confirmationTxId, setConfirmationTxId] = useState<
    string | undefined
  >();

  const isFromCurrentBatch = useCallback(
    (transactionMeta: TransactionMeta): boolean => {
      if (currentBatchIdRef.current === undefined) return true;
      if (currentBatchIdRef.current === null) return false;
      return transactionMeta.batchId === currentBatchIdRef.current;
    },
    [],
  );

  const cancelCurrentBatch = useCallback(async () => {
    const txIds = [...trackedTxIdsRef.current];
    console.log('[HW-BatchSign] cancelCurrentBatch — aborting tracked txs:', txIds);
    trackedTxIdsRef.current = new Set();
    signedBatchIdsRef.current = new Set();
    acceptedApprovalIdsRef.current = new Set();
    approvalQueueRef.current = [];
    batchGenerationRef.current += 1;
    currentBatchIdRef.current = null;
    setConfirmationTxId(undefined);

    const pendingApprovals = Engine.context.ApprovalController.state.pendingApprovals ?? {};
    for (const [requestId, request] of Object.entries(pendingApprovals)) {
      if (request.type === 'transaction_batch' || request.type === 'transaction') {
        console.log('[HW-BatchSign] cancelCurrentBatch — rejecting pending approval', { requestId, type: request.type });
        Engine.rejectPendingApproval(requestId, new Error('Batch cancelled'), {
          ignoreMissing: true,
          logErrors: false,
        });
      }
    }

    if (txIds.length === 0) return;

    pendingAbortTxIdsRef.current = new Set(txIds);

    await Promise.allSettled(
      txIds.map((txId) => {
        try {
          Engine.context.TransactionController.abortTransactionSigning(txId);
          return undefined;
        } catch {
          pendingAbortTxIdsRef.current.delete(txId);
          return undefined;
        }
      }),
    );

    isProcessingQueueRef.current = false;
  }, []);

  useEffect(() => {
    if (!fromAddress || !isEnabled) {
      return undefined;
    }

    const targetFrom = fromAddress.toLowerCase();
    const handledTxIds = new Set<string>();

    const approvalQueue = approvalQueueRef.current;
    const isProcessingQueue = () => isProcessingQueueRef.current;
    const setProcessingQueue = (val: boolean) => { isProcessingQueueRef.current = val; };

    const processApprovalQueue = async () => {
      if (isProcessingQueue()) return;
      setProcessingQueue(true);

      try {
        const myGeneration = batchGenerationRef.current;
        while (approvalQueue.length > 0) {
          if (batchGenerationRef.current !== myGeneration) break;
          const requestId = approvalQueue.shift()!;
          let deviceConfirmedReady = false;
          let hasHandledRejection = false;

          const handleApprovalRejection = (): void => {
            if (hasHandledRejection) return;
            hasHandledRejection = true;
            if (batchGenerationRef.current !== myGeneration) {
              console.log('[HW-BatchSign] Stale batch rejection — ignoring', { requestId });
              return;
            }

            if (!deviceConfirmedReady) {
              console.log('[HW-BatchSign] Device not ready — re-queueing for automatic retry', { requestId });
              approvalQueue.unshift(requestId);
              return;
            }

            const isLateSignedBatchRejection =
              currentBatchIdRef.current === requestId &&
              signedBatchIdsRef.current.has(requestId);
            if (isLateSignedBatchRejection) {
              console.log('[HW-BatchSign] Skipping rejection — late signed batch rejection', { requestId });
              return;
            }
            console.log('[HW-BatchSign] Rejecting approval and cleaning up', { requestId });
            acceptedApprovalIdsRef.current.delete(requestId);
            Engine.rejectPendingApproval(
              requestId,
              new Error('User rejected the transaction'),
              { ignoreMissing: true, logErrors: false },
            );
            dispatchRef.current(
              updateHardwareWalletsSwaps({ type: HardwareWalletsSwapsEventType.TransactionFailed }),
            );
          };

          try {
            const hardwareWalletOperation = hardwareWalletOperationRef.current;
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
              execute: async () => {
                deviceConfirmedReady = true;
                console.log('[HW-BatchSign] Executing ApprovalController.acceptRequest', { requestId });
                await Engine.context.ApprovalController.acceptRequest(
                  requestId,
                  undefined,
                  { waitForResult: true },
                );
                console.log('[HW-BatchSign] ApprovalController.acceptRequest completed', { requestId });
              },
              onRejected: handleApprovalRejection,
            });
            if (result) {
              acceptedApprovalIdsRef.current.delete(requestId);
            }
          } catch {
            handleApprovalRejection();
          }
        }
      } finally {
        setProcessingQueue(false);
        if (approvalQueue.length > 0) {
          processApprovalQueue();
        }
      }
    };

    const enqueuePendingApprovals = () => {
      const { ApprovalController } = Engine.context;
      const pendingApprovals = ApprovalController.state.pendingApprovals ?? {};
      console.log('[HW-BatchSign] enqueuePendingApprovals — count:', Object.keys(pendingApprovals).length);

      for (const [requestId, request] of Object.entries(pendingApprovals)) {
        if (acceptedApprovalIdsRef.current.has(requestId)) {
          continue;
        }

        if (request.type === 'transaction') {
          const txMeta = Engine.context.TransactionController.state.transactions.find(
            (tx: TransactionMeta) => tx.id === requestId,
          );
          if (txMeta && matchesTx(txMeta, targetFrom)) {
            console.log('[HW-BatchSign] Enqueuing pending transaction approval', { requestId, txType: txMeta.type });
            acceptedApprovalIdsRef.current.add(requestId);
            approvalQueue.push(requestId);
          }
        } else if (request.type === 'transaction_batch') {
          console.log('[HW-BatchSign] Enqueuing pending transaction_batch approval', { requestId });
          acceptedApprovalIdsRef.current.add(requestId);
          approvalQueue.push(requestId);
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

      const { status, type } = transactionMeta;
      const stepKind = getStepKind(type as TransactionType);
      console.log('[HW-BatchSign] transactionStatusUpdated', {
        txId: transactionMeta.id,
        status,
        type,
        stepKind,
        batchId: transactionMeta.batchId,
      });

      if (status === TransactionStatus.approved) {
        console.log('[HW-BatchSign] Transaction approved — dispatching SIGNING', { txId: transactionMeta.id, stepKind });
        if (transactionMeta.batchId) {
          seenBatchIdsRef.current.add(transactionMeta.batchId);
          if (!currentBatchIdRef.current) {
            currentBatchIdRef.current = transactionMeta.batchId;
            console.log('[HW-BatchSign] Set currentBatchId', transactionMeta.batchId);
          }
        } else if (currentBatchIdRef.current === null) {
          currentBatchIdRef.current = undefined;
          console.log('[HW-BatchSign] Non-batch tx after cancellation — resetting to accept-all mode');
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
          console.log('[HW-BatchSign] Signed tx not from current batch — ignoring', { txId: transactionMeta.id, batchId: transactionMeta.batchId });
          return;
        }
        console.log('[HW-BatchSign] Transaction signed — dispatching SIGNED', { txId: transactionMeta.id, stepKind });
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
          console.log('[HW-BatchSign] All tracked txs resolved — clearing confirmationTxId');
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
      if (handledTxIds.has(transactionMeta.id)) return;
      if (!isFromCurrentBatch(transactionMeta)) {
        return;
      }
      if (pendingAbortTxIdsRef.current.has(transactionMeta.id)) {
        pendingAbortTxIdsRef.current.delete(transactionMeta.id);
        console.log('[HW-BatchSign] transactionRejected for aborted tx — ignoring', { txId: transactionMeta.id });
        return;
      }

      const stepKind = getStepKind(transactionMeta.type as TransactionType);
      console.log('[HW-BatchSign] transactionRejected — dispatching REJECTED', { txId: transactionMeta.id, stepKind });
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
      if (handledTxIds.has(transactionMeta.id)) return;
      if (!isFromCurrentBatch(transactionMeta)) {
        return;
      }
      if (pendingAbortTxIdsRef.current.has(transactionMeta.id)) {
        pendingAbortTxIdsRef.current.delete(transactionMeta.id);
        console.log('[HW-BatchSign] transactionFailed for aborted tx — ignoring', { txId: transactionMeta.id });
        return;
      }

      console.log('[HW-BatchSign] transactionFailed — dispatching TRANSACTION_FAILED', { txId: transactionMeta.id });
      dispatchRef.current(
        updateHardwareWalletsSwaps({ type: HardwareWalletsSwapsEventType.TransactionFailed }),
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
  }, [fromAddress, isEnabled, isFromCurrentBatch]);

  return { cancelCurrentBatch, confirmationTxId };
}
