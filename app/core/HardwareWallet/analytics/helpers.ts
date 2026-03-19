import {
  ErrorCode,
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

/**
 * Default location value used before `showAwaitingConfirmation` is called
 * (i.e. during the initial connection / device-readiness phase).
 */
export const HARDWARE_WALLET_CONNECTION_FLOW = 'connection';

/**
 * Normalized error type categories for analytics.
 * Matches the segment schema enum for `error_type`.
 */
export enum HardwareWalletAnalyticsErrorType {
  DeviceLocked = 'Device Locked',
  DeviceDisconnected = 'Device Disconnected',
  EthereumAppNotOpened = 'Ethereum App Not Opened',
  BluetoothDisabled = 'Bluetooth Disabled',
  BlindSigningNotEnabled = 'Blind Signing Not Enabled',
  GenericError = 'Generic Error',
}

/**
 * Maps an SDK ErrorCode to the analytics error_type category.
 */
export function getAnalyticsErrorType(
  errorCode: ErrorCode,
): HardwareWalletAnalyticsErrorType {
  switch (errorCode) {
    case ErrorCode.AuthenticationDeviceLocked:
    case ErrorCode.AuthenticationDeviceBlocked:
      return HardwareWalletAnalyticsErrorType.DeviceLocked;

    case ErrorCode.DeviceDisconnected:
    case ErrorCode.DeviceNotFound:
    case ErrorCode.DeviceNotReady:
    case ErrorCode.DeviceUnresponsive:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.ConnectionTimeout:
      return HardwareWalletAnalyticsErrorType.DeviceDisconnected;

    case ErrorCode.DeviceStateEthAppClosed:
    case ErrorCode.DeviceMissingCapability:
      return HardwareWalletAnalyticsErrorType.EthereumAppNotOpened;

    case ErrorCode.BluetoothDisabled:
    case ErrorCode.PermissionBluetoothDenied:
      return HardwareWalletAnalyticsErrorType.BluetoothDisabled;

    case ErrorCode.DeviceStateBlindSignNotSupported:
      return HardwareWalletAnalyticsErrorType.BlindSigningNotEnabled;

    default:
      return HardwareWalletAnalyticsErrorType.GenericError;
  }
}

/**
 * Derives the analytics error_type from the current connection state.
 * Returns null for non-error states.
 */
export function getErrorTypeFromConnectionState(
  connectionState: HardwareWalletConnectionState,
): HardwareWalletAnalyticsErrorType | null {
  if (connectionState.status === ConnectionStatus.ErrorState) {
    return getAnalyticsErrorType(connectionState.error.code);
  }
  if (connectionState.status === ConnectionStatus.AwaitingApp) {
    return HardwareWalletAnalyticsErrorType.EthereumAppNotOpened;
  }
  return null;
}

/**
 * Maps HardwareWalletType to the capitalised manufacturer name
 * expected by the segment schema `device_type` property.
 */
export function getAnalyticsDeviceType(
  walletType: HardwareWalletType | null,
): string {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return 'Ledger';
    case HardwareWalletType.Trezor:
      return 'Trezor';
    case HardwareWalletType.OneKey:
      return 'OneKey';
    case HardwareWalletType.Lattice:
      return 'Lattice';
    case HardwareWalletType.Qr:
      return 'QR Hardware';
    default:
      return 'Unknown';
  }
}

export interface ErrorDetails {
  error_code: string;
  error_message: string;
}

/**
 * Extracts `error_code` and `error_message` from the current connection state.
 */
export function getErrorDetails(
  connectionState: HardwareWalletConnectionState,
): ErrorDetails {
  if (connectionState.status === ConnectionStatus.ErrorState) {
    const { error } = connectionState;
    return {
      error_code: String(error.code),
      error_message: error.userMessage ?? '',
    };
  }
  if (connectionState.status === ConnectionStatus.AwaitingApp) {
    return {
      error_code: String(ErrorCode.DeviceStateEthAppClosed),
      error_message: `Open ${connectionState.appName ?? 'Ethereum'} app on device`,
    };
  }
  return { error_code: '', error_message: '' };
}
