import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  executeHardwareWalletOperation,
  isUserCancellation,
} from '..';
import { useQRHardwareContext } from '../../../components/Views/confirmations/context/qr-hardware-context';

interface UseQrConfirmOptions {
  fromAddress: string;
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
  fromAddress,
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
}: UseQrConfirmOptions) {
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const { isSigningQRObject } = useQRHardwareContext();

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
        setPendingOperationAddress,
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
    fromAddress,
    isSigningQRObject,
    executeQrConfirmation,
    isTransactionReq,
    onReject,
    ensureDeviceReady,
    setPendingOperationAddress,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  ]);

  return { onConfirm };
}
