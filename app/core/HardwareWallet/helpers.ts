import { isHardwareAccount } from '../../util/address';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import {
  Category,
  ErrorCode,
  HardwareWalletError,
  HardwareWalletType,
  Severity,
} from '@metamask/hw-wallet-sdk';
import { strings } from '../../../locales/i18n';
import { getDeviceId } from '../Ledger/Ledger';

const LEDGER_DEVICE_ID_LOOKUP_TIMEOUT_MS = 5000;

const createLedgerDeviceIdLookupTimeoutError = () =>
  new HardwareWalletError('Ledger device id lookup timed out', {
    code: ErrorCode.DeviceUnresponsive,
    severity: Severity.Warning,
    category: Category.Connection,
    userMessage: strings('hardware_wallet.errors.connection_timeout'),
    metadata: {
      walletType: HardwareWalletType.Ledger,
      errorName: 'LedgerDeviceIdLookupTimeoutError',
    },
  });

const withLedgerDeviceIdLookupTimeout = async <Result>(
  promise: Promise<Result>,
): Promise<Result> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(createLedgerDeviceIdLookupTimeoutError()),
      LEDGER_DEVICE_ID_LOOKUP_TIMEOUT_MS,
    );
  });

  return await Promise.race([promise, timeoutPromise]).finally(() => {
    // This only releases the caller. If another keyring operation already holds
    // the mutex, it still releases when that underlying operation settles.
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
};

/**
 * Helper to get wallet type display name
 */
export const getHardwareWalletTypeName = (
  walletType?: HardwareWalletType | null,
): string => {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return strings('hardware_wallet.device_names.ledger');
    case HardwareWalletType.Qr:
      return strings('hardware_wallet.device_names.qr');
    default:
      return strings('hardware_wallet.device_names.hardware_wallet');
  }
};

/**
 * Get the hardware wallet type for a given address.
 *
 * @param address - The wallet address to check
 * @returns The HardwareWalletType if it's a hardware wallet, undefined otherwise
 */
export function getHardwareWalletTypeForAddress(
  address: string,
): HardwareWalletType | undefined {
  if (isHardwareAccount(address, [ExtendedKeyringTypes.ledger])) {
    return HardwareWalletType.Ledger;
  }
  if (isHardwareAccount(address, [ExtendedKeyringTypes.qr])) {
    return HardwareWalletType.Qr;
  }
  return undefined;
}

/**
 * Resolve the transport-specific device id for a hardware wallet address.
 *
 * Some hardware wallets, like Ledger over BLE, require a persisted device id
 * to reconnect. Others, like QR signers, do not.
 */
export async function getDeviceIdForAddress(
  address: string,
): Promise<string | undefined> {
  const walletType = getHardwareWalletTypeForAddress(address);

  switch (walletType) {
    case HardwareWalletType.Ledger:
      return await withLedgerDeviceIdLookupTimeout(getDeviceId());
    default:
      return undefined;
  }
}

/**
 * Returns i18n keys for connection tips based on the wallet type.
 */
export function getConnectionTipsForWalletType(
  walletType: HardwareWalletType | null,
): string[] {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return [
        'hardware_wallet.connecting.tip_unlock',
        'hardware_wallet.connecting.tip_open_app',
        'hardware_wallet.connecting.tip_enable_bluetooth',
      ];
    case HardwareWalletType.Qr:
      return [
        'hardware_wallet.connecting.qr_tip_scan',
        'hardware_wallet.connecting.qr_tip_align',
        'hardware_wallet.connecting.qr_tip_lighting',
      ];
    default:
      return [];
  }
}
