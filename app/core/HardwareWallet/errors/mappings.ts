/**
 * Error Mappings
 *
 * Mobile extensions for SDK error codes.
 * Defines recoveryAction, localized messages, and icons for each error.
 */

import { strings } from '../../../../locales/i18n';
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { getHardwareWalletTypeName } from '../helpers';
import { RecoveryAction, MobileErrorExtension } from './types';

/**
 * Mobile extensions for error codes
 * Only defines what's NOT in the SDK: recoveryAction, localized messages, icons
 */
export const MOBILE_ERROR_EXTENSIONS: Partial<
  Record<ErrorCode, MobileErrorExtension>
> = {
  // Authentication
  [ErrorCode.AuthenticationDeviceLocked]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Lock,
    iconColor: IconColor.Error,
    getLocalizedTitle: (walletType) =>
      strings('hardware_wallet.error.device_locked_title', {
        device: getHardwareWalletTypeName(walletType),
      }),
    getLocalizedMessage: (walletType) =>
      strings('hardware_wallet.errors.device_locked', {
        device: getHardwareWalletTypeName(walletType),
      }),
  },
  [ErrorCode.AuthenticationDeviceBlocked]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Lock,
    iconColor: IconColor.Error,
    getLocalizedTitle: (walletType) =>
      strings('hardware_wallet.error.device_locked_title', {
        device: getHardwareWalletTypeName(walletType),
      }),
    getLocalizedMessage: (walletType) =>
      strings('hardware_wallet.errors.device_locked', {
        device: getHardwareWalletTypeName(walletType),
      }),
  },

  // Device State
  [ErrorCode.DeviceStateEthAppClosed]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Setting,
    iconColor: IconColor.Error,
    getLocalizedTitle: () => strings('hardware_wallet.error.app_not_open'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.app_not_open'),
  },
  [ErrorCode.DeviceDisconnected]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Plug,
    iconColor: IconColor.Error,
    getLocalizedTitle: (walletType) =>
      strings('hardware_wallet.error.device_disconnected_title', {
        device: getHardwareWalletTypeName(walletType),
      }),
    getLocalizedMessage: (walletType) =>
      strings('hardware_wallet.errors.device_disconnected', {
        device: getHardwareWalletTypeName(walletType),
      }),
  },
  [ErrorCode.DeviceNotFound]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Search,
    iconColor: IconColor.Error,
    getLocalizedTitle: (walletType) =>
      strings('hardware_wallet.error.device_not_found_title', {
        device: getHardwareWalletTypeName(walletType),
      }),
    getLocalizedMessage: (walletType) =>
      strings('hardware_wallet.errors.device_not_found', {
        device: getHardwareWalletTypeName(walletType),
      }),
  },
  [ErrorCode.DeviceNotReady]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Clock,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.something_went_wrong'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.device_not_ready'),
  },
  [ErrorCode.DeviceMissingCapability]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Setting,
    iconColor: IconColor.Error,
    getLocalizedTitle: () => strings('hardware_wallet.error.app_not_open'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.app_not_open'),
  },
  [ErrorCode.DeviceStateBlindSignNotSupported]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Eye,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.blind_signing_disabled'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.blind_signing'),
  },
  [ErrorCode.DeviceUnresponsive]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Clock,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.connection_timeout'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.connection_timeout'),
  },

  // Connection
  [ErrorCode.ConnectionClosed]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Close,
    iconColor: IconColor.Error,
    getLocalizedTitle: () => strings('hardware_wallet.error.connection_closed'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.connection_closed'),
  },
  [ErrorCode.ConnectionTimeout]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Clock,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.connection_timeout'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.connection_timeout'),
  },

  // User Action
  [ErrorCode.UserRejected]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Close,
    iconColor: IconColor.Info,
    getLocalizedTitle: () => strings('hardware_wallet.error.user_cancelled'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.user_cancelled'),
  },
  [ErrorCode.UserCancelled]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Close,
    iconColor: IconColor.Info,
    getLocalizedTitle: () => strings('hardware_wallet.error.user_cancelled'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.user_cancelled'),
  },
  [ErrorCode.UserConfirmationRequired]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.SecurityTick,
    iconColor: IconColor.Warning,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.pending_confirmation'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.pending_confirmation'),
  },

  // BLE/Permission - these need OPEN_APP_SETTINGS action
  [ErrorCode.PermissionBluetoothDenied]: {
    recoveryAction: RecoveryAction.OPEN_APP_SETTINGS,
    icon: IconName.Connect,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.bluetooth_permission_denied'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.bluetooth_permission_denied'),
  },
  [ErrorCode.PermissionLocationDenied]: {
    recoveryAction: RecoveryAction.OPEN_APP_SETTINGS,
    icon: IconName.Location,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.location_permission_denied'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.location_permission_denied'),
  },
  [ErrorCode.PermissionNearbyDevicesDenied]: {
    recoveryAction: RecoveryAction.OPEN_APP_SETTINGS,
    icon: IconName.Connect,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.nearby_devices_permission_denied'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.nearby_permission_denied'),
  },
  // Bluetooth disabled needs OPEN_BLUETOOTH_SETTINGS (platform-specific handling)
  [ErrorCode.BluetoothDisabled]: {
    recoveryAction: RecoveryAction.OPEN_BLUETOOTH_SETTINGS,
    icon: IconName.Connect,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.bluetooth_required'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.bluetooth_off'),
  },
  [ErrorCode.BluetoothScanFailed]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Connect,
    iconColor: IconColor.Error,
    getLocalizedTitle: () => strings('hardware_wallet.error.scan_failed'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.bluetooth_scan_failed'),
  },
  [ErrorCode.BluetoothConnectionFailed]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Connect,
    iconColor: IconColor.Error,
    getLocalizedTitle: () => strings('hardware_wallet.error.connection_closed'),
    getLocalizedMessage: () =>
      strings('hardware_wallet.errors.bluetooth_connection_failed'),
  },

  // Mobile-specific
  [ErrorCode.MobileNotSupported]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Danger,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.something_went_wrong'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.not_supported'),
  },

  // Unknown
  [ErrorCode.Unknown]: {
    recoveryAction: RecoveryAction.ACKNOWLEDGE,
    icon: IconName.Danger,
    iconColor: IconColor.Error,
    getLocalizedTitle: () =>
      strings('hardware_wallet.error.something_went_wrong'),
    getLocalizedMessage: () => strings('hardware_wallet.errors.unknown_error'),
  },
};

/**
 * Maps Ledger error names to SDK error codes.
 * Used by parser.ts to identify errors by their JavaScript error name.
 */
export const ERROR_NAME_MAPPINGS: Record<string, ErrorCode> = {
  DisconnectedDevice: ErrorCode.DeviceDisconnected,
  DisconnectedDeviceDuringOperation: ErrorCode.DeviceDisconnected,
  TransportLocked: ErrorCode.AuthenticationDeviceLocked,
  TransportError: ErrorCode.BluetoothConnectionFailed,
  LockedDeviceError: ErrorCode.AuthenticationDeviceLocked,
  LedgerTimeoutError: ErrorCode.DeviceUnresponsive,
  TransportOpenUserCancelled: ErrorCode.UserCancelled,
  BluetoothRequired: ErrorCode.BluetoothDisabled,
  PairingFailed: ErrorCode.BluetoothConnectionFailed,
  PeerRemovedPairing: ErrorCode.BluetoothConnectionFailed,
  UserRefusedAddress: ErrorCode.UserRejected,
  UserRefusedOnDevice: ErrorCode.UserRejected,
  DeviceSocketFail: ErrorCode.BluetoothConnectionFailed,
  DeviceSocketNoBulkStatus: ErrorCode.BluetoothConnectionFailed,
};

/**
 * Additional Ledger status codes not covered by SDK mappings.
 * These are Mobile-specific or legacy codes.
 */
export const ADDITIONAL_STATUS_CODE_MAPPINGS: Record<number, ErrorCode> = {
  0x6b0c: ErrorCode.AuthenticationDeviceLocked, // LOCKED (not in SDK)
  0x6a15: ErrorCode.DeviceStateEthAppClosed, // WRONG_APP (not in SDK)
  0x6511: ErrorCode.DeviceStateEthAppClosed, // APP_NOT_OPEN (not in SDK)
};
