import { getDeviceIdForAddress } from './helpers';
import { isUserCancellation } from './errors';

interface ExecuteHardwareWalletOperationOptions {
  address: string;
  operationType: 'transaction' | 'message';
  ensureDeviceReady: (deviceId?: string | null) => Promise<boolean>;
  setPendingOperationAddress?: (address: string | null) => void;
  showAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;
  hideAwaitingConfirmation: () => void;
  showHardwareWalletError: (error: unknown) => void;
  onError?: (error: unknown) => boolean | Promise<boolean>;
  execute: () => Promise<void>;
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

    showAwaitingConfirmation(operationType, () => {
      rejectOnce().catch(() => undefined);
    });

    await execute();
    hideAwaitingConfirmation();
    return true;
  } catch (error) {
    hideAwaitingConfirmation();
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
