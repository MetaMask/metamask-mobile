import {
  getDeviceIdForAddress,
  getHardwareWalletTypeForAddress,
} from './helpers';
import { isUserCancellation } from './errors';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';

interface ExecuteHardwareWalletOperationOptions {
  address: string;
  operationType: 'transaction' | 'message';
  ensureDeviceReady: (deviceId?: string | null) => Promise<boolean>;
  setTargetWalletType?: (walletType: HardwareWalletType | null) => void;
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
 */
export async function executeHardwareWalletOperation({
  address,
  operationType,
  ensureDeviceReady,
  setTargetWalletType,
  showAwaitingConfirmation,
  hideAwaitingConfirmation,
  showHardwareWalletError,
  onError,
  execute,
  onRejected,
}: ExecuteHardwareWalletOperationOptions): Promise<boolean> {
  let hasRejected = false;
  const walletType = getHardwareWalletTypeForAddress(address) ?? null;

  const rejectOnce = async () => {
    if (hasRejected) {
      return;
    }

    hasRejected = true;
    await onRejected?.();
  };

  if (walletType) {
    setTargetWalletType?.(walletType);
  }

  try {
    const deviceId = await getDeviceIdForAddress(address);
    const isReady = await ensureDeviceReady(deviceId);

    if (!isReady) {
      await rejectOnce();
      return false;
    }

    // QR wallets use their own signing UI (QR modal) instead of the
    // generic "awaiting confirmation" bottom sheet meant for BLE devices.
    const isQrWallet = walletType === HardwareWalletType.Qr;

    if (!isQrWallet) {
      showAwaitingConfirmation(operationType, () => {
        // The UI callback is synchronous, so swallow async rejection here to
        // avoid an unhandled promise rejection from caller-provided cleanup.
        rejectOnce().catch(() => undefined);
      });
    }

    await execute();

    if (!isQrWallet) {
      hideAwaitingConfirmation();
    }
    return true;
  } catch (error) {
    if (walletType !== HardwareWalletType.Qr) {
      hideAwaitingConfirmation();
    }
    const hasHandledError = (await onError?.(error)) ?? false;

    if (!hasRejected && !hasHandledError && !isUserCancellation(error)) {
      showHardwareWalletError(error);
    }

    await rejectOnce();
    return false;
  } finally {
    if (walletType) {
      setTargetWalletType?.(null);
    }
  }
}
