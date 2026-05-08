import { useCallback, useRef } from 'react';

import {
  useHardwareWallet,
  isUserCancellation,
} from '../../../../core/HardwareWallet';
import { getDeviceId } from '../../../../core/Ledger/Ledger';
import type { EnsureDeviceReadyOptions } from '../../../../core/HardwareWallet/types';

interface UseLedgerConfirmOptions {
  onReject: () => void;
  onTransactionConfirm: (opts?: {
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  executeApproval: () => Promise<void>;
  isTransactionReq: boolean;
  ensureDeviceReadyOptions?: EnsureDeviceReadyOptions;
}

/**
 * Encapsulates the Ledger-specific confirmation flow:
 * device readiness check, awaiting on-device confirmation,
 * signing dispatch, and error / cancellation handling.
 */
export function useLedgerConfirm({
  onReject,
  onTransactionConfirm,
  executeApproval,
  isTransactionReq,
  ensureDeviceReadyOptions,
}: UseLedgerConfirmOptions) {
  const {
    ensureDeviceReady,
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

    try {
      const deviceId = await getDeviceId();
      const isReady = await ensureDeviceReady(
        deviceId,
        ensureDeviceReadyOptions,
      );

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
    }
  }, [
    onReject,
    isTransactionReq,
    onTransactionConfirm,
    executeApproval,
    ensureDeviceReadyOptions,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  ]);

  return { onConfirm };
}
