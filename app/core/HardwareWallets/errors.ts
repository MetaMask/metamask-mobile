/**
 * Hardware Wallet Error Handling
 *
 * Centralized error mapping for all hardware wallet types.
 */

import { strings } from '../../../locales/i18n';
import {
  ConnectionState,
  HardwareWalletConnectionState,
  HardwareWalletError,
  HardwareWalletErrorCode,
  HardwareWalletType,
  QRHardwareError,
  QRHardwareErrorCode,
} from './types';
import { LedgerCommunicationErrors } from '../Ledger/ledgerErrors';
import Logger from '../../util/Logger';

const LOG_TAG = 'HardwareWalletErrors';

/**
 * Error details configuration for each error code
 */
interface ErrorConfig {
  titleKey: string;
  subtitleKey: string;
  isRetryable: boolean;
  showSettings: boolean;
}

/**
 * Default error configurations by error code
 */
const ERROR_CONFIGS: Record<HardwareWalletErrorCode, ErrorConfig> = {
  // Connection errors
  [HardwareWalletErrorCode.DEVICE_DISCONNECTED]: {
    titleKey: 'hardware_wallet.error.device_disconnected',
    subtitleKey: 'hardware_wallet.error.device_disconnected_message',
    isRetryable: true,
    showSettings: false,
  },
  [HardwareWalletErrorCode.CONNECTION_FAILED]: {
    titleKey: 'hardware_wallet.error.connection_failed',
    subtitleKey: 'hardware_wallet.error.connection_failed_message',
    isRetryable: true,
    showSettings: false,
  },
  [HardwareWalletErrorCode.DEVICE_NOT_FOUND]: {
    titleKey: 'hardware_wallet.error.device_not_found',
    subtitleKey: 'hardware_wallet.error.device_not_found_message',
    isRetryable: true,
    showSettings: false,
  },

  // Bluetooth/Permission errors
  [HardwareWalletErrorCode.BLUETOOTH_OFF]: {
    titleKey: 'hardware_wallet.error.bluetooth_off',
    subtitleKey: 'hardware_wallet.error.bluetooth_off_message',
    isRetryable: true,
    showSettings: true,
  },
  [HardwareWalletErrorCode.BLUETOOTH_PERMISSION_DENIED]: {
    titleKey: 'hardware_wallet.error.bluetooth_permission_denied',
    subtitleKey: 'hardware_wallet.error.bluetooth_permission_denied_message',
    isRetryable: true,
    showSettings: true,
  },
  [HardwareWalletErrorCode.LOCATION_PERMISSION_DENIED]: {
    titleKey: 'hardware_wallet.error.location_permission_denied',
    subtitleKey: 'hardware_wallet.error.location_permission_denied_message',
    isRetryable: true,
    showSettings: true,
  },
  [HardwareWalletErrorCode.NEARBY_DEVICES_PERMISSION_DENIED]: {
    titleKey: 'hardware_wallet.error.nearby_devices_permission_denied',
    subtitleKey:
      'hardware_wallet.error.nearby_devices_permission_denied_message',
    isRetryable: true,
    showSettings: true,
  },

  // App errors
  [HardwareWalletErrorCode.APP_NOT_INSTALLED]: {
    titleKey: 'hardware_wallet.error.app_not_installed',
    subtitleKey: 'hardware_wallet.error.app_not_installed_message',
    isRetryable: false,
    showSettings: false,
  },
  [HardwareWalletErrorCode.APP_NOT_OPEN]: {
    titleKey: 'hardware_wallet.error.app_not_open',
    subtitleKey: 'hardware_wallet.error.app_not_open_message',
    isRetryable: true,
    showSettings: false,
  },
  [HardwareWalletErrorCode.FAILED_TO_OPEN_APP]: {
    titleKey: 'hardware_wallet.error.failed_to_open_app',
    subtitleKey: 'hardware_wallet.error.failed_to_open_app_message',
    isRetryable: true,
    showSettings: false,
  },
  [HardwareWalletErrorCode.FAILED_TO_CLOSE_APP]: {
    titleKey: 'hardware_wallet.error.failed_to_close_app',
    subtitleKey: 'hardware_wallet.error.failed_to_close_app_message',
    isRetryable: true,
    showSettings: false,
  },

  // User action errors
  [HardwareWalletErrorCode.USER_REJECTED]: {
    titleKey: 'hardware_wallet.error.user_rejected',
    subtitleKey: 'hardware_wallet.error.user_rejected_message',
    isRetryable: false,
    showSettings: false,
  },
  [HardwareWalletErrorCode.DEVICE_LOCKED]: {
    titleKey: 'hardware_wallet.error.device_locked',
    subtitleKey: 'hardware_wallet.error.device_locked_message',
    isRetryable: true,
    showSettings: false,
  },
  [HardwareWalletErrorCode.PENDING_CONFIRMATION]: {
    titleKey: 'hardware_wallet.error.pending_confirmation',
    subtitleKey: 'hardware_wallet.error.pending_confirmation_message',
    isRetryable: true,
    showSettings: false,
  },

  // Signing errors
  [HardwareWalletErrorCode.BLIND_SIGNING_DISABLED]: {
    titleKey: 'hardware_wallet.error.blind_signing_disabled',
    subtitleKey: 'hardware_wallet.error.blind_signing_disabled_message',
    isRetryable: false,
    showSettings: false,
  },
  [HardwareWalletErrorCode.NOT_SUPPORTED]: {
    titleKey: 'hardware_wallet.error.not_supported',
    subtitleKey: 'hardware_wallet.error.not_supported_message',
    isRetryable: false,
    showSettings: false,
  },
  [HardwareWalletErrorCode.NONCE_TOO_LOW]: {
    titleKey: 'hardware_wallet.error.nonce_too_low',
    subtitleKey: 'hardware_wallet.error.nonce_too_low_message',
    isRetryable: false,
    showSettings: false,
  },

  // Generic
  [HardwareWalletErrorCode.UNKNOWN_ERROR]: {
    titleKey: 'hardware_wallet.error.unknown',
    subtitleKey: 'hardware_wallet.error.unknown_message',
    isRetryable: false,
    showSettings: false,
  },
};

/**
 * Create a HardwareWalletError from an error code
 */
export const createHardwareWalletError = (
  code: HardwareWalletErrorCode,
  walletType: HardwareWalletType,
): HardwareWalletError => {
  const config =
    ERROR_CONFIGS[code] || ERROR_CONFIGS[HardwareWalletErrorCode.UNKNOWN_ERROR];

  // Try to get translated strings, fall back to error code if not found
  let title: string;
  let subtitle: string;

  try {
    title = strings(config.titleKey);
    subtitle = strings(config.subtitleKey);
  } catch {
    // Fallback if translation keys don't exist yet
    title = code.replace(/_/g, ' ');
    subtitle = `An error occurred with your ${walletType} device.`;
  }

  return {
    code,
    walletType,
    title,
    subtitle,
    isRetryable: config.isRetryable,
    showSettings: config.showSettings,
  };
};

/**
 * Map Ledger-specific errors to generic HardwareWalletErrorCode
 */
export const mapLedgerErrorCode = (
  ledgerError: LedgerCommunicationErrors,
): HardwareWalletErrorCode => {
  switch (ledgerError) {
    case LedgerCommunicationErrors.LedgerDisconnected:
      return HardwareWalletErrorCode.DEVICE_DISCONNECTED;
    case LedgerCommunicationErrors.LedgerHasPendingConfirmation:
      return HardwareWalletErrorCode.PENDING_CONFIRMATION;
    case LedgerCommunicationErrors.FailedToOpenApp:
      return HardwareWalletErrorCode.FAILED_TO_OPEN_APP;
    case LedgerCommunicationErrors.FailedToCloseApp:
      return HardwareWalletErrorCode.FAILED_TO_CLOSE_APP;
    case LedgerCommunicationErrors.UserRefusedConfirmation:
      return HardwareWalletErrorCode.USER_REJECTED;
    case LedgerCommunicationErrors.AppIsNotInstalled:
      return HardwareWalletErrorCode.APP_NOT_INSTALLED;
    case LedgerCommunicationErrors.LedgerIsLocked:
      return HardwareWalletErrorCode.DEVICE_LOCKED;
    case LedgerCommunicationErrors.NotSupported:
      return HardwareWalletErrorCode.NOT_SUPPORTED;
    case LedgerCommunicationErrors.NonceTooLow:
      return HardwareWalletErrorCode.NONCE_TOO_LOW;
    case LedgerCommunicationErrors.BlindSignError:
      return HardwareWalletErrorCode.BLIND_SIGNING_DISABLED;
    case LedgerCommunicationErrors.UnknownError:
    default:
      return HardwareWalletErrorCode.UNKNOWN_ERROR;
  }
};

/**
 * Ledger Transport status codes
 */
const LEDGER_STATUS_CODES = {
  APP_NOT_INSTALLED_1: 0x6984,
  APP_NOT_INSTALLED_2: 0x6807,
  USER_REJECTED_1: 0x6985,
  USER_REJECTED_2: 0x5501,
  DEVICE_LOCKED: 0x6b0c,
} as const;

/**
 * Parse a raw error from Ledger operations and map to HardwareWalletError
 */
export const parseLedgerError = (error: unknown): HardwareWalletError => {
  const walletType = HardwareWalletType.LEDGER;

  if (error && typeof error === 'object') {
    const err = error as {
      name?: string;
      statusCode?: number;
      message?: string;
    };

    // Handle TransportStatusError from Ledger SDK
    if (err.name === 'TransportStatusError' && err.statusCode) {
      switch (err.statusCode) {
        case LEDGER_STATUS_CODES.APP_NOT_INSTALLED_1:
        case LEDGER_STATUS_CODES.APP_NOT_INSTALLED_2:
          return createHardwareWalletError(
            HardwareWalletErrorCode.APP_NOT_INSTALLED,
            walletType,
          );
        case LEDGER_STATUS_CODES.USER_REJECTED_1:
        case LEDGER_STATUS_CODES.USER_REJECTED_2:
          return createHardwareWalletError(
            HardwareWalletErrorCode.USER_REJECTED,
            walletType,
          );
        case LEDGER_STATUS_CODES.DEVICE_LOCKED:
          return createHardwareWalletError(
            HardwareWalletErrorCode.DEVICE_LOCKED,
            walletType,
          );
        default:
          return createHardwareWalletError(
            HardwareWalletErrorCode.UNKNOWN_ERROR,
            walletType,
          );
      }
    }

    // Handle TransportRaceCondition
    if (err.name === 'TransportRaceCondition') {
      return createHardwareWalletError(
        HardwareWalletErrorCode.PENDING_CONFIRMATION,
        walletType,
      );
    }

    // Handle error messages
    if (err.message) {
      if (
        err.message.includes(
          'Only version 4 of typed data signing is supported',
        )
      ) {
        return createHardwareWalletError(
          HardwareWalletErrorCode.NOT_SUPPORTED,
          walletType,
        );
      }
      if (err.message.includes('Ledger device: Locked device')) {
        return createHardwareWalletError(
          HardwareWalletErrorCode.DEVICE_LOCKED,
          walletType,
        );
      }
      if (err.message.includes('nonce too low')) {
        return createHardwareWalletError(
          HardwareWalletErrorCode.NONCE_TOO_LOW,
          walletType,
        );
      }
      if (err.message.includes('Please enable Blind signing')) {
        return createHardwareWalletError(
          HardwareWalletErrorCode.BLIND_SIGNING_DISABLED,
          walletType,
        );
      }
    }
  }

  return createHardwareWalletError(
    HardwareWalletErrorCode.UNKNOWN_ERROR,
    walletType,
  );
};

/**
 * BLE error codes from react-native-ble-plx
 */
const BLE_ERROR_CODES = {
  // Connection errors
  DEVICE_DISCONNECTED: 201,
  DEVICE_NOT_CONNECTED: 203,
  DEVICE_ALREADY_CONNECTED: 204,
  // Operation errors
  OPERATION_CANCELLED: 2,
  OPERATION_TIMEOUT: 3,
  // Bluetooth state errors
  BLUETOOTH_POWERED_OFF: 102,
  BLUETOOTH_UNAUTHORIZED: 101,
  BLUETOOTH_UNSUPPORTED: 100,
  // iOS specific
  DEVICE_MTU_CHANGE_FAILED: 302,
} as const;

/**
 * Parse BLE-specific errors from react-native-ble-plx or Ledger transport
 */
export const parseBleError = (error: unknown): HardwareWalletError => {
  const walletType = HardwareWalletType.LEDGER;

  if (!error || typeof error !== 'object') {
    return createHardwareWalletError(
      HardwareWalletErrorCode.UNKNOWN_ERROR,
      walletType,
    );
  }

  const bleError = error as {
    errorCode?: number;
    iosErrorCode?: number;
    reason?: string;
    message?: string;
    name?: string;
  };

  // Handle iOS pairing removed error
  if (
    bleError.iosErrorCode === 14 ||
    bleError.reason === 'Peer removed pairing information'
  ) {
    return createHardwareWalletError(
      HardwareWalletErrorCode.CONNECTION_FAILED,
      walletType,
    );
  }

  // Handle BLE error codes
  if (bleError.errorCode !== undefined) {
    switch (bleError.errorCode) {
      case BLE_ERROR_CODES.DEVICE_DISCONNECTED:
      case BLE_ERROR_CODES.DEVICE_NOT_CONNECTED:
        return createHardwareWalletError(
          HardwareWalletErrorCode.DEVICE_DISCONNECTED,
          walletType,
        );
      case BLE_ERROR_CODES.BLUETOOTH_POWERED_OFF:
        return createHardwareWalletError(
          HardwareWalletErrorCode.BLUETOOTH_OFF,
          walletType,
        );
      case BLE_ERROR_CODES.BLUETOOTH_UNAUTHORIZED:
        return createHardwareWalletError(
          HardwareWalletErrorCode.BLUETOOTH_PERMISSION_DENIED,
          walletType,
        );
      case BLE_ERROR_CODES.BLUETOOTH_UNSUPPORTED:
        return createHardwareWalletError(
          HardwareWalletErrorCode.NOT_SUPPORTED,
          walletType,
        );
      case BLE_ERROR_CODES.OPERATION_TIMEOUT:
        return createHardwareWalletError(
          HardwareWalletErrorCode.PENDING_CONFIRMATION,
          walletType,
        );
      case BLE_ERROR_CODES.OPERATION_CANCELLED:
        return createHardwareWalletError(
          HardwareWalletErrorCode.USER_REJECTED,
          walletType,
        );
      default:
        break;
    }
  }

  // Handle Ledger-specific errors from the message
  if (bleError.message) {
    if (bleError.message.includes('Locked device')) {
      return createHardwareWalletError(
        HardwareWalletErrorCode.DEVICE_LOCKED,
        walletType,
      );
    }
    if (
      bleError.message.includes('disconnected') ||
      bleError.message.includes('DisconnectedDevice')
    ) {
      return createHardwareWalletError(
        HardwareWalletErrorCode.DEVICE_DISCONNECTED,
        walletType,
      );
    }
    if (bleError.message.includes('CantOpenDevice')) {
      return createHardwareWalletError(
        HardwareWalletErrorCode.CONNECTION_FAILED,
        walletType,
      );
    }
    if (bleError.message.includes('PairingFailed')) {
      return createHardwareWalletError(
        HardwareWalletErrorCode.CONNECTION_FAILED,
        walletType,
      );
    }
    if (bleError.message.includes('TransportExchangeTimeout')) {
      return createHardwareWalletError(
        HardwareWalletErrorCode.PENDING_CONFIRMATION,
        walletType,
      );
    }
  }

  // Handle error name
  if (bleError.name) {
    switch (bleError.name) {
      case 'DisconnectedDeviceDuringOperation':
        return createHardwareWalletError(
          HardwareWalletErrorCode.DEVICE_DISCONNECTED,
          walletType,
        );
      case 'CantOpenDevice':
        return createHardwareWalletError(
          HardwareWalletErrorCode.DEVICE_NOT_FOUND,
          walletType,
        );
      case 'PairingFailed':
        return createHardwareWalletError(
          HardwareWalletErrorCode.CONNECTION_FAILED,
          walletType,
        );
      case 'PeerRemovedPairing':
        return createHardwareWalletError(
          HardwareWalletErrorCode.CONNECTION_FAILED,
          walletType,
        );
      case 'TransportExchangeTimeoutError':
        return createHardwareWalletError(
          HardwareWalletErrorCode.PENDING_CONFIRMATION,
          walletType,
        );
      default:
        break;
    }
  }

  return createHardwareWalletError(
    HardwareWalletErrorCode.UNKNOWN_ERROR,
    walletType,
  );
};

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: HardwareWalletError): boolean =>
  error.isRetryable;

/**
 * Check if an error requires opening device settings
 */
export const requiresSettings = (error: HardwareWalletError): boolean =>
  error.showSettings;

/**
 * Check if an error indicates the device needs to be unlocked
 */
export const isDeviceLockedError = (error: HardwareWalletError): boolean =>
  error.code === HardwareWalletErrorCode.DEVICE_LOCKED;

/**
 * Check if an error indicates the app needs to be opened
 */
export const isAppNotOpenError = (error: HardwareWalletError): boolean =>
  error.code === HardwareWalletErrorCode.APP_NOT_OPEN ||
  error.code === HardwareWalletErrorCode.APP_NOT_INSTALLED ||
  error.code === HardwareWalletErrorCode.FAILED_TO_OPEN_APP;

/**
 * Check if an error indicates Bluetooth issues
 */
export const isBluetoothError = (error: HardwareWalletError): boolean =>
  error.code === HardwareWalletErrorCode.BLUETOOTH_OFF ||
  error.code === HardwareWalletErrorCode.BLUETOOTH_PERMISSION_DENIED;

/**
 * Check if an error indicates the device was disconnected
 */
export const isDisconnectedError = (error: HardwareWalletError): boolean =>
  error.code === HardwareWalletErrorCode.DEVICE_DISCONNECTED ||
  error.code === HardwareWalletErrorCode.CONNECTION_FAILED ||
  error.code === HardwareWalletErrorCode.DEVICE_NOT_FOUND;

/**
 * Derive connection state from an error
 * Maps hardware wallet errors to appropriate connection states
 */
export const getConnectionStateFromError = (
  hwError: HardwareWalletError,
): HardwareWalletConnectionState => {
  if (isDeviceLockedError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates device is locked');
    return ConnectionState.error('locked', hwError);
  }
  if (isAppNotOpenError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates app not open');
    return ConnectionState.awaitingApp('not_open');
  }
  if (isDisconnectedError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates disconnection');
    return ConnectionState.disconnected();
  }
  return ConnectionState.error('generic', hwError);
};

/**
 * Parse error based on wallet type and return appropriate HardwareWalletError
 */
export const parseErrorByType = (
  err: unknown,
  type: HardwareWalletType,
): HardwareWalletError => {
  switch (type) {
    case HardwareWalletType.LEDGER:
      return parseLedgerError(err);
    case HardwareWalletType.TREZOR:
    case HardwareWalletType.QR:
    default:
      return createHardwareWalletError(
        HardwareWalletErrorCode.UNKNOWN_ERROR,
        type,
      );
  }
};

// ============================================================================
// QR Hardware Wallet Error Handling
// ============================================================================

/**
 * Error configurations for QR hardware errors
 */
interface QRErrorConfig {
  titleKey: string;
  subtitleKey: string;
  isRetryable: boolean;
}

const QR_ERROR_CONFIGS: Record<QRHardwareErrorCode, QRErrorConfig> = {
  [QRHardwareErrorCode.CAMERA_PERMISSION_DENIED]: {
    titleKey: 'qr_hardware.error.camera_permission_denied',
    subtitleKey: 'qr_hardware.error.camera_permission_denied_message',
    isRetryable: true,
  },
  [QRHardwareErrorCode.INVALID_QR_CODE]: {
    titleKey: 'qr_hardware.error.invalid_qr_code',
    subtitleKey: 'qr_hardware.error.invalid_qr_code_message',
    isRetryable: true,
  },
  [QRHardwareErrorCode.SCAN_CANCELLED]: {
    titleKey: 'qr_hardware.error.scan_cancelled',
    subtitleKey: 'qr_hardware.error.scan_cancelled_message',
    isRetryable: true,
  },
  [QRHardwareErrorCode.SCAN_TIMEOUT]: {
    titleKey: 'qr_hardware.error.scan_timeout',
    subtitleKey: 'qr_hardware.error.scan_timeout_message',
    isRetryable: true,
  },
  [QRHardwareErrorCode.DEVICE_NOT_SUPPORTED]: {
    titleKey: 'qr_hardware.error.device_not_supported',
    subtitleKey: 'qr_hardware.error.device_not_supported_message',
    isRetryable: false,
  },
  [QRHardwareErrorCode.UNKNOWN_ERROR]: {
    titleKey: 'qr_hardware.error.unknown',
    subtitleKey: 'qr_hardware.error.unknown_message',
    isRetryable: false,
  },
};

/**
 * Create a QRHardwareError from an error code
 */
export const createQRHardwareError = (
  code: QRHardwareErrorCode,
): QRHardwareError => {
  const config =
    QR_ERROR_CONFIGS[code] ||
    QR_ERROR_CONFIGS[QRHardwareErrorCode.UNKNOWN_ERROR];

  let title: string;
  let subtitle: string;

  try {
    title = strings(config.titleKey);
    subtitle = strings(config.subtitleKey);
  } catch {
    // Fallback if translation keys don't exist yet
    title = code.replace(/_/g, ' ');
    subtitle = 'An error occurred with your QR hardware wallet.';
  }

  return {
    code,
    title,
    subtitle,
    isRetryable: config.isRetryable,
  };
};

/**
 * Parse a raw error from QR operations and map to QRHardwareError
 */
export const parseQRError = (error: unknown): QRHardwareError => {
  if (error && typeof error === 'object') {
    const err = error as {
      name?: string;
      message?: string;
      code?: string;
    };

    // Handle specific error messages
    if (err.message) {
      if (
        err.message.includes('permission') ||
        err.message.includes('Permission') ||
        err.message.includes('camera')
      ) {
        return createQRHardwareError(
          QRHardwareErrorCode.CAMERA_PERMISSION_DENIED,
        );
      }
      if (
        err.message.includes('cancelled') ||
        err.message.includes('canceled') ||
        err.message.includes('Cancelled') ||
        err.message.includes('Canceled')
      ) {
        return createQRHardwareError(QRHardwareErrorCode.SCAN_CANCELLED);
      }
      if (
        err.message.includes('invalid') ||
        err.message.includes('Invalid') ||
        err.message.includes('parse')
      ) {
        return createQRHardwareError(QRHardwareErrorCode.INVALID_QR_CODE);
      }
      if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        return createQRHardwareError(QRHardwareErrorCode.SCAN_TIMEOUT);
      }
    }

    // Handle error name
    if (err.name) {
      switch (err.name) {
        case 'CameraPermissionError':
          return createQRHardwareError(
            QRHardwareErrorCode.CAMERA_PERMISSION_DENIED,
          );
        case 'InvalidQRError':
          return createQRHardwareError(QRHardwareErrorCode.INVALID_QR_CODE);
        case 'ScanCancelledError':
          return createQRHardwareError(QRHardwareErrorCode.SCAN_CANCELLED);
        case 'ScanTimeoutError':
          return createQRHardwareError(QRHardwareErrorCode.SCAN_TIMEOUT);
        default:
          break;
      }
    }
  }

  return createQRHardwareError(QRHardwareErrorCode.UNKNOWN_ERROR);
};

/**
 * Check if a QR error is retryable
 */
export const isQRRetryableError = (error: QRHardwareError): boolean =>
  error.isRetryable;

/**
 * Check if a QR error is a camera permission error
 */
export const isQRCameraPermissionError = (error: QRHardwareError): boolean =>
  error.code === QRHardwareErrorCode.CAMERA_PERMISSION_DENIED;

/**
 * Check if a QR error is a scan cancelled error
 */
export const isQRScanCancelledError = (error: QRHardwareError): boolean =>
  error.code === QRHardwareErrorCode.SCAN_CANCELLED;
