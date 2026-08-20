import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  isUserCancellation,
} from '../../../../core/HardwareWallet';
import { getDeviceIdForAddress } from '../../../../core/HardwareWallet/helpers';

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
 * Encapsulates the Ledger-specific confirmation flow:
 * device readiness check, awaiting on-device confirmation,
 * signing dispatch, and error / cancellation handling.
 */
export function useLedgerConfirm({
  fromAddress,
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
}: UseLedgerConfirmOptions) {
  const {
    ensureDeviceReady,
    setPendingOperationAddress,
    showHardwareWalletError,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
  } = useHardwareWallet();

  const hasRejectedRef = useRef(false);

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

    setPendingOperationAddress(fromAddress);

    try {
      const deviceId = await getDeviceIdForAddress(fromAddress);
      const isReady = await ensureDeviceReady(deviceId);

      if (!isReady) {
        rejectOnce();
        return;
      }

      const operationType = isTransactionReq ? 'transaction' : 'message';
      showAwaitingConfirmation(operationType, () => {
        rejectOnce();
      });

      if (isTransactionReq) {
        await onTransactionConfirm({
          onError: (err) => {
            throw err;
          },
        });
      } else {
        await executeApproval();
      }

      hideAwaitingConfirmation();
    } catch (err) {
      hideAwaitingConfirmation();

      if (!hasRejectedRef.current && !isUserCancellation(err)) {
        showHardwareWalletError(err);
      }

      rejectOnce();
    } finally {
      setPendingOperationAddress(null);
    }
  }, [
    onReject,
    isTransactionReq,
    onTransactionConfirm,
    executeApproval,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    setPendingOperationAddress,
    fromAddress,
  ]);

  return { onConfirm };
}
