import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { Dispatch, AnyAction } from 'redux';
import {
  TransactionStatus,
  type TransactionMeta,
  type TransactionBatchSingleRequest,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { getDeviceIdForAddress } from '../../../../core/HardwareWallet/helpers';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import useSubmitBridgeTx from '../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
  type HardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';
import type { SubmissionParams } from './HardwareWalletsSwaps';
import { getTransactionById } from './hw-batch-sign/utils';

/** Returns the deferred send approval when it still matches the route id. */
function getMatchingDeferredApproval<T extends { id: string }>(
  approvalRequest: T | undefined,
  expectedApprovalRequestId: string | undefined,
): T | undefined {
  if (
    !approvalRequest ||
    !expectedApprovalRequestId ||
    approvalRequest.id !== expectedApprovalRequestId
  ) {
    return undefined;
  }
  return approvalRequest;
}

/**
 * Retry path after the confirmation approval was consumed. Drops any orphan
 * parent tx, then re-adds the send batch without approval.
 */
async function retrySendTransaction(
  preparedTxMeta: TransactionMeta,
): Promise<void> {
  const orphanParent = getTransactionById(preparedTxMeta.id);
  if (
    orphanParent &&
    (orphanParent.status === TransactionStatus.approved ||
      orphanParent.status === TransactionStatus.signed)
  ) {
    try {
      Engine.controllerMessenger.call(
        'TransactionController:updateTransaction',
        { ...orphanParent, status: TransactionStatus.dropped },
        'HW send retry — dropping orphan parent tx',
      );
    } catch {
      // Ignore errors from dropping the orphan parent tx
    }
  }

  const extras = preparedTxMeta.batchTransactions ?? [];
  const before: TransactionBatchSingleRequest[] = [];
  const after: TransactionBatchSingleRequest[] = [];
  for (const extra of extras) {
    const { isAfter, type, ...params } = extra;
    const entry: TransactionBatchSingleRequest = { params, type };
    if (isAfter === false) {
      before.push(entry);
    } else {
      after.push(entry);
    }
  }

  const { data, gas, maxFeePerGas, maxPriorityFeePerGas, to, value } =
    preparedTxMeta.txParams;
  const sendEntry: TransactionBatchSingleRequest = {
    params: {
      data: data as Hex | undefined,
      gas: gas as Hex | undefined,
      maxFeePerGas: maxFeePerGas as Hex | undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas as Hex | undefined,
      to: to as Hex | undefined,
      value: value as Hex | undefined,
    },
    type: preparedTxMeta.type,
  };

  await Engine.context.TransactionController.addTransactionBatch({
    from: preparedTxMeta.txParams.from as Hex,
    networkClientId: preparedTxMeta.networkClientId,
    origin: 'metamask',
    isInternal: true,
    requireApproval: false,
    disableHook: false,
    disableSequential: true,
    disable7702: true,
    transactions: [...before, sendEntry, ...after],
  });
}

interface UseHardwareWalletSubmitOptions {
  isSendFlow: boolean;
  walletAddress?: string;
  dispatch: Dispatch<AnyAction>;
  progressRef: RefObject<HardwareWalletsSwapsState>;
  submissionGenerationRef: RefObject<number>;
  preparedTxMeta?: TransactionMeta;
  approvalRequestId?: string;
  submissionParams?: SubmissionParams;
  ensureDeviceReady?: (deviceId?: string | null) => Promise<boolean>;
  setPendingOperationAddress?: (address: string | null) => void;
}

/**
 * Owns the submit path for the HW signing-progress screen, branching on flow.
 * Send: asserts the deferred approval id matches the pending approval
 * (WALLET SAFETY) and calls `Engine.acceptPendingApproval` with the
 * prepared tx meta. Bridge: pulls cached submission params and calls
 * `submitBridgeTx`.
 *
 * Exposes behavioral methods only — `submit()`, `canRetry()`,
 * `clearCachedSubmission()` — so callers never reach into internal refs.
 */
export function useHardwareWalletSubmit({
  isSendFlow,
  walletAddress,
  dispatch,
  progressRef,
  submissionGenerationRef,
  preparedTxMeta,
  approvalRequestId,
  submissionParams,
  ensureDeviceReady,
  setPendingOperationAddress,
}: UseHardwareWalletSubmitOptions): {
  submit: () => Promise<void>;
  /** True when enough state is cached to retry. Send: pending approval + prepared tx; bridge: cached params. */
  canRetry: () => boolean;
  /** Clears the cached bridge submission params (no-op in send mode). */
  clearCachedSubmission: () => void;
} {
  const { approvalRequest } = useApprovalRequest();
  const approvalRequestRef = useRef(approvalRequest);
  approvalRequestRef.current = approvalRequest;
  const preparedTxMetaRef = useRef(preparedTxMeta);
  preparedTxMetaRef.current = preparedTxMeta;
  const approvalRequestIdRef = useRef(approvalRequestId);
  approvalRequestIdRef.current = approvalRequestId;

  const { submitBridgeTx } = useSubmitBridgeTx();
  const submitBridgeTxRef = useRef(submitBridgeTx);
  submitBridgeTxRef.current = submitBridgeTx;
  const cachedSubmissionParams = useRef<SubmissionParams | null>(
    submissionParams ?? null,
  );
  useEffect(() => {
    if (submissionParams && !cachedSubmissionParams.current) {
      cachedSubmissionParams.current = submissionParams;
    }
  }, [submissionParams]);

  // Shared stale-submission guard + TransactionFailed dispatch.
  const runSubmit = useCallback(
    async (submitFn: () => Promise<unknown>) => {
      const myGeneration = submissionGenerationRef.current;
      try {
        await submitFn();
      } catch (error) {
        if (submissionGenerationRef.current !== myGeneration) return;
        Logger.error(error as Error, 'HW swap submit failed');
        const status = progressRef.current.status;
        // Only transition to Failed from active phases:
        // - Waiting:  HW signing step failed (device error, keyring error, etc.)
        // - Submitted: signing succeeded but the broadcast (STX backend) failed
        //
        // Other statuses (Rejected, Disconnected, Cancelled, Failed, Idle) are
        // already terminal or handled — the error is redundant and skipping it
        // avoids overwriting state the reducer deliberately expects to be retryable.
        if (
          status === HardwareWalletsSwapsStatus.Waiting ||
          status === HardwareWalletsSwapsStatus.Submitted
        ) {
          dispatch(
            updateHardwareWalletsSwaps({
              type: HardwareWalletsSwapsEventType.TransactionFailed,
            }),
          );
        }
      }
    },
    [dispatch, progressRef, submissionGenerationRef],
  );

  // ── Send flow ──────────────────────────────────────────────────────
  const submitSendFlow = useCallback(async () => {
    const currentApprovalRequest = approvalRequestRef.current;
    const currentPreparedTxMeta = preparedTxMetaRef.current;
    const expectedApprovalRequestId = approvalRequestIdRef.current;
    if (!walletAddress || !currentPreparedTxMeta) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

    await runSubmit(async () => {
      setPendingOperationAddress?.(walletAddress);
      try {
        const deviceId = await getDeviceIdForAddress(walletAddress);
        const isReady = await ensureDeviceReady?.(deviceId);
        if (!isReady) {
          dispatch(
            updateHardwareWalletsSwaps({
              type: HardwareWalletsSwapsEventType.TransactionFailed,
            }),
          );
          return;
        }

        const matchingApproval = getMatchingDeferredApproval(
          currentApprovalRequest,
          expectedApprovalRequestId,
        );
        if (matchingApproval) {
          // Initial submit: accept the confirmation approval.
          await Engine.acceptPendingApproval(
            matchingApproval.id,
            {
              ...matchingApproval.requestData,
              txMeta: currentPreparedTxMeta,
            },
            {
              waitForResult: true,
              deleteAfterResult: true,
              handleErrors: false,
            },
          );
        } else {
          await retrySendTransaction(currentPreparedTxMeta);
        }
      } finally {
        setPendingOperationAddress?.(null);
      }
    });
  }, [
    dispatch,
    walletAddress,
    runSubmit,
    ensureDeviceReady,
    setPendingOperationAddress,
  ]);

  // ── Bridge flow (UNCHANGED) ─────────────────────────────────────────
  const submitBridgeFlow = useCallback(async () => {
    const cachedParams = cachedSubmissionParams.current;
    if (!cachedParams || !walletAddress) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.TransactionFailed,
        }),
      );
      return;
    }

    await runSubmit(() => submitBridgeTxRef.current(cachedParams));
  }, [dispatch, walletAddress, runSubmit]);

  const submit = useCallback(async () => {
    if (isSendFlow) {
      await submitSendFlow();
      return;
    }
    await submitBridgeFlow();
  }, [isSendFlow, submitSendFlow, submitBridgeFlow]);

  // Callers query behavior without reaching into internal refs.
  const canRetry = useCallback((): boolean => {
    if (isSendFlow) {
      // Don't require the approval — it's consumed after the first attempt
      // (deleteAfterResult). Retry re-adds the transaction directly.
      return Boolean(preparedTxMetaRef.current);
    }
    return Boolean(cachedSubmissionParams.current);
  }, [isSendFlow]);

  const clearCachedSubmission = useCallback(() => {
    cachedSubmissionParams.current = null;
  }, []);

  return {
    submit,
    canRetry,
    clearCachedSubmission,
  };
}
