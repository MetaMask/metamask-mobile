import {
  ErrorCode,
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';
import { isQRHardwareScanError, QRHardwareScanErrorType } from '../errors';
import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';

/**
 * Analytics flow locations for hardware wallet interactions.
 */
export enum HardwareWalletAnalyticsFlow {
  Connection = 'Connection',
  Send = 'Send',
  Swaps = 'Swaps',
  Transaction = 'Transaction',
  Message = 'Message',
}

const SIGNATURE_APPROVAL_TYPES = new Set<string>([
  'personal_sign',
  'eth_signTypedData',
]);

const SEND_TRANSACTION_TYPES = new Set<TransactionType>([
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  TransactionType.tokenMethodTransferFrom,
  TransactionType.tokenMethodSafeTransferFrom,
]);

const SWAP_TRANSACTION_TYPES = new Set<TransactionType>([
  TransactionType.swap,
  TransactionType.swapApproval,
  TransactionType.swapAndSend,
  TransactionType.bridge,
  TransactionType.bridgeApproval,
]);

/**
 * Derives the analytics flow from the current pending approval.
 *
 * @param approvalType - The pending approval's `type` string (e.g. 'transaction', 'personal_sign').
 * @param transactionType - The transaction type from TransactionMeta, if available.
 * @returns The analytics flow to report as `location`.
 */
export function getAnalyticsFlowFromApproval({
  approvalType,
  transactionType,
}: {
  approvalType?: string;
  transactionType?: TransactionType;
}): HardwareWalletAnalyticsFlow {
  if (!approvalType) {
    return HardwareWalletAnalyticsFlow.Connection;
  }

  if (SIGNATURE_APPROVAL_TYPES.has(approvalType)) {
    return HardwareWalletAnalyticsFlow.Message;
  }

  if (approvalType === ApprovalType.Transaction && transactionType) {
    if (SEND_TRANSACTION_TYPES.has(transactionType)) {
      return HardwareWalletAnalyticsFlow.Send;
    }
    if (SWAP_TRANSACTION_TYPES.has(transactionType)) {
      return HardwareWalletAnalyticsFlow.Swaps;
    }
    return HardwareWalletAnalyticsFlow.Transaction;
  }

  return HardwareWalletAnalyticsFlow.Connection;
}

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
      error_message: error.userMessage ?? 'No error message',
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

/**
 * Segment/MetaMetrics properties for QR hardware camera scan failures
 * (`Hardware Wallet Connection Failed` / recovery UI), when the connection
 * {@link ConnectionStatus.ErrorState} error is a {@link isQRHardwareScanError}.
 */
export function getQrHardwareScanErrorAnalyticsProperties(
  connectionState: HardwareWalletConnectionState,
): Record<string, string | boolean> {
  if (connectionState.status !== ConnectionStatus.ErrorState) {
    return {};
  }
  const { error } = connectionState;
  if (!isQRHardwareScanError(error)) {
    return {};
  }
  const { metadata } = error;
  const payload: Record<string, string | boolean> = {
    error_category: metadata.qrHardwareScanErrorType,
    is_ur_format: metadata.isUrFormat,
  };
  if (
    metadata.qrHardwareScanErrorType === QRHardwareScanErrorType.WrongURType
  ) {
    payload.received_ur_type = metadata.receivedUrType ?? '';
  }
  return payload;
}
