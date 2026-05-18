import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  executeHardwareWalletOperation,
  isUserCancellation,
} from '..';
import { useQRHardwareContext } from '../../../components/Views/confirmations/context/qr-hardware-context';
import useApprovalRequest from '../../../components/Views/confirmations/hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../components/Views/confirmations/hooks/transactions/useTransactionMetadataRequest';

interface UseQrConfirmOptions {
  onReject: () => void;
  onTransactionConfirm: (opts?: {
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  executeApproval: () => Promise<void>;
  isTransactionReq: boolean;
}

/**
 * Coordinates QR hardware wallet confirmation for transactions and message approvals.
 *
 * Ensures the QR account is ready, shows the awaiting-confirmation UI, opens the
 * scanner when a QR signing payload is already active, and forwards terminal
 * errors through the hardware wallet error flow.
 *
 * @returns An `onConfirm` callback for the confirmation submit action.
 */
export function useQrConfirm({
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
}: UseQrConfirmOptions) {
  const {
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const { isSigningQRObject } = useQRHardwareContext();

  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  const hasRejectedRef = useRef(false);

  const executeQrConfirmation = useCallback(async () => {
    if (isTransactionReq) {
      await onTransactionConfirm({
        onError: (err) => {
          throw err;
        },
      });
      return;
    }

    await executeApproval();
  }, [executeApproval, isTransactionReq, onTransactionConfirm]);

  const onConfirm = useCallback(async () => {
    hasRejectedRef.current = false;

    const rejectOnce = () => {
      if (hasRejectedRef.current) return;
      hasRejectedRef.current = true;
      onReject();
    };

    const fromAddress =
      (approvalRequest?.requestData?.from as string) ||
      (transactionMetadata?.txParams?.from as string);

    if (!fromAddress) {
      rejectOnce();
      return;
    }

    // If QR signing is already in progress, re-show the awaiting-confirmation
    // bottom sheet (which displays the QR code and its own scanner) rather than
    // opening the QRInfo scanner that skips the QR-code display step.
    if (isSigningQRObject) {
      showAwaitingConfirmation(
        isTransactionReq ? 'transaction' : 'message',
        () => {
          rejectOnce();
        },
      );
      return;
    }

    try {
      await executeHardwareWalletOperation({
        address: fromAddress,
        operationType: isTransactionReq ? 'transaction' : 'message',
        ensureDeviceReady,
        showAwaitingConfirmation,
        hideAwaitingConfirmation,
        showHardwareWalletError,
        execute: executeQrConfirmation,
        onRejected: rejectOnce,
      });
    } catch (err) {
      if (!hasRejectedRef.current && !isUserCancellation(err)) {
        showHardwareWalletError(err);
      }
      rejectOnce();
    }
  }, [
    approvalRequest?.requestData?.from,
    transactionMetadata?.txParams?.from,
    isSigningQRObject,
    isTransactionReq,
    executeQrConfirmation,
    onReject,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  ]);

  return { onConfirm };
}
