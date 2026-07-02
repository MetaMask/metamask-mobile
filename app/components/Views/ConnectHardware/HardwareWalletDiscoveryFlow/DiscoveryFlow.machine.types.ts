import type { ErrorCode } from '@metamask/hw-wallet-sdk';
import type { DiscoveredDevice } from '../../../../core/HardwareWallet/types';

export enum DiscoveryStep {
  Searching = 'searching',
  Found = 'found',
  NotFound = 'not-found',
  Accounts = 'accounts',
  BluetoothAccessDenied = 'bluetooth-access-denied',
  LocationAccessDenied = 'location-access-denied',
  NearbyDevicesDenied = 'nearby-devices-denied',
  DeviceLocked = 'device-locked',
  DeviceUnresponsive = 'device-unresponsive',
  AppNotOpen = 'app-not-open',
  TransportUnavailable = 'transport-unavailable',
  TransportConnectionFailed = 'transport-connection-failed',
  PermissionDenied = 'permission-denied',
}

export enum HardwareWalletDiscoveryEventType {
  PermissionsGranted = 'PERMISSIONS_GRANTED',
  PermissionsDenied = 'PERMISSIONS_DENIED',
  DeviceFound = 'DEVICE_FOUND',
  Timeout = 'TIMEOUT',
  ScanError = 'SCAN_ERROR',
  TransportUnavailable = 'TRANSPORT_UNAVAILABLE',
  TransportAvailable = 'TRANSPORT_AVAILABLE',
  ConnectError = 'CONNECT_ERROR',
  DeviceSelected = 'DEVICE_SELECTED',
  Retry = 'RETRY',
  Back = 'BACK',
  OpenAccounts = 'OPEN_ACCOUNTS',
}

export type MachineEvent =
  | { type: HardwareWalletDiscoveryEventType.PermissionsGranted }
  | {
      type: HardwareWalletDiscoveryEventType.PermissionsDenied;
      errorCode: ErrorCode;
    }
  | {
      type: HardwareWalletDiscoveryEventType.DeviceFound;
      device: DiscoveredDevice;
    }
  | { type: HardwareWalletDiscoveryEventType.Timeout }
  | { type: HardwareWalletDiscoveryEventType.ScanError; error: Error }
  | { type: HardwareWalletDiscoveryEventType.TransportUnavailable }
  | { type: HardwareWalletDiscoveryEventType.TransportAvailable }
  | {
      type: HardwareWalletDiscoveryEventType.ConnectError;
      errorCode: ErrorCode;
    }
  | {
      type: HardwareWalletDiscoveryEventType.DeviceSelected;
      device: DiscoveredDevice;
    }
  | { type: HardwareWalletDiscoveryEventType.Retry }
  | { type: HardwareWalletDiscoveryEventType.Back }
  | {
      type: HardwareWalletDiscoveryEventType.OpenAccounts;
      device: DiscoveredDevice;
    };
