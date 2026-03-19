import {
  ErrorCode,
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

/**
 * Default flow value used before `showAwaitingConfirmation` is called
 * (i.e. during the initial connection / device-readiness phase).
 */
export const HARDWARE_WALLET_CONNECTION_FLOW = 'Connection';

/**
 * Normalized error state categories for analytics.
 * Matches the segment schema enum for `error_state`.
 */
export enum HardwareWalletAnalyticsErrorState {
  DeviceLocked = 'Device Locked',
  DeviceDisconnected = 'Device Disconnected',
  EthereumAppNotOpened = 'Ethereum App Not Opened',
  BluetoothDisabled = 'Bluetooth Disabled',
  BlindSigningNotEnabled = 'Blind Signing Not Enabled',
  GenericError = 'Generic Error',
}

/**
 * Maps an SDK ErrorCode to the analytics error_state category.
 */
export function getAnalyticsErrorState(
  errorCode: ErrorCode,
): HardwareWalletAnalyticsErrorState {
  switch (errorCode) {
    case ErrorCode.AuthenticationDeviceLocked:
    case ErrorCode.AuthenticationDeviceBlocked:
      return HardwareWalletAnalyticsErrorState.DeviceLocked;

    case ErrorCode.DeviceDisconnected:
    case ErrorCode.DeviceNotFound:
    case ErrorCode.DeviceNotReady:
    case ErrorCode.DeviceUnresponsive:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.ConnectionTimeout:
      return HardwareWalletAnalyticsErrorState.DeviceDisconnected;

    case ErrorCode.DeviceStateEthAppClosed:
    case ErrorCode.DeviceMissingCapability:
      return HardwareWalletAnalyticsErrorState.EthereumAppNotOpened;

    case ErrorCode.BluetoothDisabled:
    case ErrorCode.PermissionBluetoothDenied:
      return HardwareWalletAnalyticsErrorState.BluetoothDisabled;

    case ErrorCode.DeviceStateBlindSignNotSupported:
      return HardwareWalletAnalyticsErrorState.BlindSigningNotEnabled;

    default:
      return HardwareWalletAnalyticsErrorState.GenericError;
  }
}

/**
 * Derives the analytics error_state from the current connection state.
 * Returns null for non-error states.
 */
export function getErrorStateFromConnectionState(
  connectionState: HardwareWalletConnectionState,
): HardwareWalletAnalyticsErrorState | null {
  if (connectionState.status === ConnectionStatus.ErrorState) {
    return getAnalyticsErrorState(connectionState.error.code);
  }
  if (connectionState.status === ConnectionStatus.AwaitingApp) {
    return HardwareWalletAnalyticsErrorState.EthereumAppNotOpened;
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

/**
 * Builds a `raw_error` string from the current connection state,
 * including error code, message, and cause when available.
 */
export function buildRawErrorString(
  connectionState: HardwareWalletConnectionState,
): string {
  if (connectionState.status === ConnectionStatus.ErrorState) {
    const { error } = connectionState;
    const parts: string[] = [`code=${error.code}`];
    if (error.userMessage) {
      parts.push(`message=${error.userMessage}`);
    }
    if (error.cause) {
      parts.push(
        `cause=${error.cause instanceof Error ? error.cause.message : String(error.cause)}`,
      );
    }
    return parts.join('; ');
  }
  if (connectionState.status === ConnectionStatus.AwaitingApp) {
    return `status=awaiting_app; appName=${connectionState.appName ?? 'Ethereum'}`;
  }
  return '';
}
