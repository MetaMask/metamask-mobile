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

export function useQrConfirm({
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
}: UseQrConfirmOptions) {
  const {
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const { isSigningQRObject, setScannerVisible } = useQRHardwareContext();

  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  const hasRejectedRef = useRef(false);

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

    // If QR signing is already in progress, open the camera scanner
    if (isSigningQRObject) {
      setScannerVisible(true);
      return;
    }

    try {
      await executeHardwareWalletOperation({
        address: fromAddress,
        operationType: isTransactionReq ? 'transaction' : 'message',
        ensureDeviceReady,
        setTargetWalletType,
        showAwaitingConfirmation,
        hideAwaitingConfirmation,
        showHardwareWalletError,
        execute: async () => {
          if (isTransactionReq) {
            await onTransactionConfirm({
              onError: (err) => {
                throw err;
              },
            });
          } else {
            await executeApproval();
          }
        },
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
    onReject,
    onTransactionConfirm,
    executeApproval,
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    setScannerVisible,
  ]);

  return { onConfirm };
}
