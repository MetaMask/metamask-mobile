import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  executeHardwareWalletOperation,
} from '../../../../core/HardwareWallet';

interface UseLedgerConfirmOptions {
  fromAddress: string;
  onReject: () => void;
  onTransactionConfirm: (opts?: {
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  executeApproval: () => Promise<void>;
  isTransactionReq: boolean;
}

/**
 * Encapsulates the hardware-wallet confirmation flow:
 * device readiness check, awaiting on-device confirmation,
 * signing dispatch, and error / cancellation handling.
 */
export function useHardwareWalletConfirm({
  fromAddress,
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
}: UseLedgerConfirmOptions) {
  const {
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  const hasRejectedRef = useRef(false);

  const onConfirm = useCallback(async () => {
    hasRejectedRef.current = false;

    const rejectOnce = () => {
      if (hasRejectedRef.current) return;
      hasRejectedRef.current = true;
      onReject();
    };

    const operationType = isTransactionReq ? 'transaction' : 'message';

    await executeHardwareWalletOperation({
      address: fromAddress,
      operationType,
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
          return;
        }

        await executeApproval();
      },
      onRejected: rejectOnce,
    });
  }, [
    fromAddress,
    onReject,
    isTransactionReq,
    onTransactionConfirm,
    executeApproval,
    ensureDeviceReady,
    setTargetWalletType,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  ]);

  return { onConfirm };
}

export const useLedgerConfirm = useHardwareWalletConfirm;
