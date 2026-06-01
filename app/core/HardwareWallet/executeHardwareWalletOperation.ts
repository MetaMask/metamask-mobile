import { getDeviceIdForAddress } from './helpers';
import { isUserCancellation } from './errors';

/**
 * Options for {@link executeHardwareWalletOperation}: resolve the device, gate on readiness,
 * show confirmation UI, and run the Ledger or QR wallet work.
 */
interface ExecuteHardwareWalletOperationOptions {
  /** Account address used to look up the device id and optional pending-operation context. */
  address: string;
  /** Drives confirmation copy and behavior for a transaction signature vs a message signature. */
  operationType: 'transaction' | 'message';
  /**
   * Returns whether the hardware device is ready to sign. Receives the id from
   * {@link getDeviceIdForAddress} when available.
   */
  ensureDeviceReady: (deviceId?: string | null) => Promise<boolean>;
  /**
   * Optional hook to set or clear the in-flight operation address (e.g. for provider context)
   * for the duration of the call; cleared in `finally`.
   */
  setPendingOperationAddress?: (address: string | null) => void;
  /**
   * Shows the "awaiting confirmation on device" UI. The optional second callback is invoked
   * if the user dismisses or rejects that prompt before signing completes.
   */
  showAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;
  /** Hides the awaiting-confirmation UI. */
  hideAwaitingConfirmation: () => void;
  /** Presents a generic error when the operation fails and the error is not user-cancelled. */
  showHardwareWalletError: (error: unknown) => void;
  /**
   * Optional error handler. If it returns `true`, the generic {@link showHardwareWalletError} flow
   * is skipped for that error.
   */
  onError?: (error: unknown) => boolean | Promise<boolean>;
  /** Performs the hardware-backed sign or related async work after the device is ready. */
  execute: () => Promise<void>;
  /**
   * Called when the user rejects the confirmation flow, the device is not ready, or an error
   * occurs after the operation is attempted.
   */
  onRejected?: () => void | Promise<void>;
}

/**
 * Run an operation behind the shared hardware-wallet readiness and
 * awaiting-confirmation flow.
 *
 * The provider auto-derives the wallet type from the pending address,
 * so callers only need to supply the address — not the wallet type.
 */
export async function executeHardwareWalletOperation({
  address,
  operationType,
  ensureDeviceReady,
  setPendingOperationAddress,
  showAwaitingConfirmation,
  hideAwaitingConfirmation,
  showHardwareWalletError,
  onError,
  execute,
  onRejected,
}: ExecuteHardwareWalletOperationOptions): Promise<boolean> {
  let hasRejected = false;
  let hasShownConfirmation = false;

  const rejectOnce = async () => {
    if (hasRejected) {
      return;
    }

    hasRejected = true;
    await onRejected?.();
  };

  setPendingOperationAddress?.(address);

  try {
    const deviceId = await getDeviceIdForAddress(address);
    const isReady = await ensureDeviceReady(deviceId);

    if (!isReady) {
      await rejectOnce();
      return false;
    }

    hasShownConfirmation = true;
    showAwaitingConfirmation(operationType, () => {
      rejectOnce().catch(() => undefined);
    });

    await execute();
    hideAwaitingConfirmation();
    return true;
  } catch (error) {
    if (hasShownConfirmation) {
      hideAwaitingConfirmation();
    }
    const hasHandledError = (await onError?.(error)) ?? false;

    if (!hasRejected && !hasHandledError && !isUserCancellation(error)) {
      showHardwareWalletError(error);
    }

    await rejectOnce();
    return false;
  } finally {
    setPendingOperationAddress?.(null);
  }
}
