import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { Dispatch, AnyAction } from 'redux';
import {
  TransactionStatus,
  type TransactionMeta,
  type TransactionBatchSingleRequest,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { getDeviceIdForAddress } from '../../../../core/HardwareWallet/helpers';
import Logger from '../../../../util/Logger';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import useSubmitBridgeTx from '../../../../util/bridge/hooks/useSubmitBridgeTx';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
  type HardwareWalletsSwapsState,
} from './HardwareWalletsSwaps.state';
import type { SubmissionParams } from './HardwareWalletsSwaps';

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
        Logger.log('[HW-SendBundle] submit FAILED', {
          error:
            error instanceof Error
              ? { message: error.message, name: error.name, stack: error.stack }
              : typeof error === 'object' && error !== null
                ? JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)))
                : String(error),
        });
        if (submissionGenerationRef.current !== myGeneration) return;
        const s = progressRef.current.status;
        if (
          s === HardwareWalletsSwapsStatus.Waiting ||
          s === HardwareWalletsSwapsStatus.Submitted
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

    // WALLET SAFETY: on the initial submit, refuse to accept unless the
    // pending approval's id matches the one deferred. On retry the approval
    // is consumed (deleteAfterResult) so we fall through to the retry path.
    const isInitialSubmit =
      Boolean(currentApprovalRequest) &&
      Boolean(expectedApprovalRequestId) &&
      currentApprovalRequest?.id === expectedApprovalRequestId;

    Logger.log('[HW-SendBundle] submit proceeding', {
      expectedId: expectedApprovalRequestId,
      actualId: currentApprovalRequest?.id,
      hasPreparedTxMeta: Boolean(currentPreparedTxMeta),
      batchTxCount: currentPreparedTxMeta.batchTransactions?.length ?? 0,
      isRetry: !isInitialSubmit,
    });

    await runSubmit(async () => {
      setPendingOperationAddress?.(walletAddress);
      try {
        const deviceId = await getDeviceIdForAddress(walletAddress);
        Logger.log('[HW-SendBundle] connecting device (submit)', { deviceId });
        const isReady = await ensureDeviceReady?.(deviceId);
        if (!isReady) {
          Logger.log('[HW-SendBundle] device not ready, aborting submit');
          return;
        }

        if (
          currentApprovalRequest &&
          expectedApprovalRequestId &&
          currentApprovalRequest.id === expectedApprovalRequestId
        ) {
          // Initial submit: accept the confirmation approval.
          Logger.log('[HW-SendBundle] device connected, accepting deferred approval', {
            approvalId: currentApprovalRequest.id,
            hasBatchTransactions: Boolean(currentPreparedTxMeta.batchTransactions?.length),
          });
          await Engine.acceptPendingApproval(
            currentApprovalRequest.id,
            {
              ...currentApprovalRequest.requestData,
              txMeta: currentPreparedTxMeta,
            },
            {
              waitForResult: true,
              deleteAfterResult: true,
              handleErrors: false,
            },
          );
        } else {
          // Retry: the confirmation approval was consumed by the first attempt
          // (deleteAfterResult: true) and cannot be re-accepted. Recreate the
          // batch the way the swaps flow does — via addTransactionBatch with
          // requireApproval:false. That creates no Transaction approval, so the
          // user is NOT routed back to the confirmation page, and every tx is
          // signed via the keyring (device prompted), exactly like the initial
          // flow's ExtraTransactionsPublishHook children.
          //
          // First drop the orphan parent tx left by the previous attempt.
          // cancelCurrentBatch (run before submit) drops the batch children,
          // but the parent send tx has no batchId and is deliberately shielded
          // from cancellation (it is the in-flight confirmation tx during the
          // initial flow). On retry its confirmation approval is already
          // consumed, so it is a stuck pre-broadcast tx. Drop ONLY this parent
          // by id, and only while it is still pre-broadcast (approved/signed) —
          // never touch submitted/confirmed txs, which may be pending on-chain.
          // Without this, the parent accumulates across attempts (previously
          // surfaced as an extra transaction on re-confirm).
          const orphanParent =
            Engine.context.TransactionController.state.transactions.find(
              (tx) => tx.id === currentPreparedTxMeta.id,
            );
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
            } catch (dropError) {
              Logger.log(
                '[HW-SendBundle] retry — drop orphan parent failed',
                dropError,
              );
            }
          }

          // Split "before" extras (isAfter === false) ahead of the send, then
          // the rest — matching ExtraTransactionsPublishHook so batch nonces
          // are assigned in the same order as the initial attempt.
          const extras = currentPreparedTxMeta.batchTransactions ?? [];
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
          // The send tx becomes a batch child with the BatchTransactionParams
          // field set (from/nonce are supplied by the batch itself, mirroring
          // ExtraTransactionsPublishHook's `firstParams`).
          const { data, gas, maxFeePerGas, maxPriorityFeePerGas, to, value } =
            currentPreparedTxMeta.txParams;
          const sendEntry: TransactionBatchSingleRequest = {
            params: {
              data: data as Hex | undefined,
              gas: gas as Hex | undefined,
              maxFeePerGas: maxFeePerGas as Hex | undefined,
              maxPriorityFeePerGas: maxPriorityFeePerGas as Hex | undefined,
              to: to as Hex | undefined,
              value: value as Hex | undefined,
            },
            type: currentPreparedTxMeta.type,
          };

          await Engine.context.TransactionController.addTransactionBatch({
            from: currentPreparedTxMeta.txParams.from as Hex,
            networkClientId: currentPreparedTxMeta.networkClientId,
            origin: 'metamask',
            isInternal: true,
            requireApproval: false,
            disableHook: false,
            disableSequential: true,
            disable7702: true,
            transactions: [...before, sendEntry, ...after],
          });
          Logger.log('[HW-SendBundle] retry batch recreated');
        }
        Logger.log('[HW-SendBundle] submit resolved');
      } finally {
        setPendingOperationAddress?.(null);
      }
    });
  }, [dispatch, walletAddress, runSubmit, ensureDeviceReady, setPendingOperationAddress]);

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

  // Behavior, not state: callers ask "can I retry?" / "clear the cache"
  // without reaching into this hook's internal refs.
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
