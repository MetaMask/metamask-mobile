import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { IconName } from '@metamask/design-system-react-native';
import { transition } from './DiscoveryFlow.machine';
import {
  DiscoveryStep,
  HardwareWalletDiscoveryEventType,
} from './DiscoveryFlow.machine.types';
import type { DeviceUIConfig } from './DiscoveryFlow.types';

const mockConfig: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: IconName.Mobile,
  troubleshootingItems: [],
  errorToStepMap: {
    [ErrorCode.AuthenticationDeviceLocked]: DiscoveryStep.DeviceLocked,
    [ErrorCode.DeviceUnresponsive]: DiscoveryStep.DeviceUnresponsive,
    [ErrorCode.DeviceStateEthAppClosed]: DiscoveryStep.AppNotOpen,
    [ErrorCode.BluetoothDisabled]: DiscoveryStep.TransportUnavailable,
    [ErrorCode.BluetoothConnectionFailed]:
      DiscoveryStep.TransportConnectionFailed,
    [ErrorCode.BluetoothScanFailed]: DiscoveryStep.TransportConnectionFailed,
    [ErrorCode.PermissionBluetoothDenied]: DiscoveryStep.BluetoothAccessDenied,
    [ErrorCode.PermissionLocationDenied]: DiscoveryStep.LocationAccessDenied,
    [ErrorCode.PermissionNearbyDevicesDenied]:
      DiscoveryStep.NearbyDevicesDenied,
  },
  accountManager: {
    getAccounts: jest.fn(),
    unlockAccounts: jest.fn(),
    forgetDevice: jest.fn(),
  },
  strings: {
    deviceFound: 'Device found',
    connectButton: 'Connect',
    deviceNotFound: 'Device not found',
    tryAgain: 'Try again',
    selectAccounts: 'Select accounts',
  },
};

const DEVICE = { id: 'device-1', name: 'Nano X' };

describe('DiscoveryFlow.machine — transition()', () => {
  describe('searching state', () => {
    it('stays searching on PERMISSIONS_GRANTED', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.PermissionsGranted },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });

    it('moves to bluetooth-access-denied on PERMISSIONS_DENIED with mapped bluetooth error', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionBluetoothDenied,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.BluetoothAccessDenied);
    });

    it('maps location permission denial to location-access-denied', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionLocationDenied,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.LocationAccessDenied);
    });

    it('moves to found on DEVICE_FOUND', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.DeviceFound,
            device: DEVICE,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Found);
    });

    it('moves to not-found on TIMEOUT', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.Timeout },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });

    it('moves to transport-connection-failed on SCAN_ERROR with mapped bluetooth error', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: Object.assign(new Error('BLE failed'), { name: 'BleError' }),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportConnectionFailed);
    });

    it('falls back to not-found on SCAN_ERROR with unmapped error', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('unknown'),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });

    it('detects bluetooth via error message containing "bluetooth"', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('bluetooth adapter failure'),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportConnectionFailed);
    });

    it('detects bluetooth via error message containing "bleerror"', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('something BleError happened'),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportConnectionFailed);
    });

    it('maps SCAN_ERROR when bluetooth is off to transport-unavailable', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('Bluetooth is off'),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportUnavailable);
    });

    it('maps SCAN_ERROR when bluetooth is not authorized to nearby-devices-denied', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('Not authorized to use Bluetooth'),
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NearbyDevicesDenied);
    });

    it('moves to transport-unavailable on TRANSPORT_UNAVAILABLE', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.TransportUnavailable },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportUnavailable);
    });

    it('stays searching on TRANSPORT_AVAILABLE', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.TransportAvailable },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });

    it('returns current step for irrelevant events', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.Retry },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
      expect(
        transition(
          DiscoveryStep.Searching,
          { type: HardwareWalletDiscoveryEventType.Back },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });
  });

  describe('found state', () => {
    it('moves to accounts on OPEN_ACCOUNTS', () => {
      expect(
        transition(
          DiscoveryStep.Found,
          {
            type: HardwareWalletDiscoveryEventType.OpenAccounts,
            device: DEVICE,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Accounts);
    });

    it('stays found on DEVICE_FOUND (additional device)', () => {
      expect(
        transition(
          DiscoveryStep.Found,
          {
            type: HardwareWalletDiscoveryEventType.DeviceFound,
            device: DEVICE,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Found);
    });

    it('maps to configured error step on CONNECT_ERROR', () => {
      expect(
        transition(
          DiscoveryStep.Found,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.DeviceLocked);
    });

    it('falls back to not-found on unmapped CONNECT_ERROR', () => {
      expect(
        transition(
          DiscoveryStep.Found,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.Unknown,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });

    it('returns current step for irrelevant events', () => {
      expect(
        transition(
          DiscoveryStep.Found,
          { type: HardwareWalletDiscoveryEventType.Timeout },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Found);
    });
  });

  describe('accounts state', () => {
    it('stays accounts on most events', () => {
      expect(
        transition(
          DiscoveryStep.Accounts,
          { type: HardwareWalletDiscoveryEventType.Timeout },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Accounts);
      expect(
        transition(
          DiscoveryStep.Accounts,
          {
            type: HardwareWalletDiscoveryEventType.DeviceFound,
            device: DEVICE,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Accounts);
    });

    it('moves to found on BACK', () => {
      expect(
        transition(
          DiscoveryStep.Accounts,
          { type: HardwareWalletDiscoveryEventType.Back },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Found);
    });

    it('moves to searching on RETRY', () => {
      expect(
        transition(
          DiscoveryStep.Accounts,
          { type: HardwareWalletDiscoveryEventType.Retry },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });
  });

  describe('not-found state', () => {
    it('moves to searching on RETRY', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          { type: HardwareWalletDiscoveryEventType.Retry },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });

    it('maps PERMISSIONS_DENIED with location error to location-access-denied', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionLocationDenied,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.LocationAccessDenied);
    });

    it('maps PERMISSIONS_DENIED with bluetooth error to bluetooth-access-denied', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionBluetoothDenied,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.BluetoothAccessDenied);
    });

    it('maps PERMISSIONS_DENIED with nearby-devices error to nearby-devices-denied', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionNearbyDevicesDenied,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NearbyDevicesDenied);
    });

    it('stays not-found on other events', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          { type: HardwareWalletDiscoveryEventType.Timeout },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });

    it('moves to transport-unavailable on TRANSPORT_UNAVAILABLE', () => {
      expect(
        transition(
          DiscoveryStep.NotFound,
          { type: HardwareWalletDiscoveryEventType.TransportUnavailable },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.TransportUnavailable);
    });
  });

  describe('error states', () => {
    const errorSteps: DiscoveryStep[] = [
      DiscoveryStep.DeviceLocked,
      DiscoveryStep.DeviceUnresponsive,
      DiscoveryStep.AppNotOpen,
      DiscoveryStep.TransportUnavailable,
      DiscoveryStep.TransportConnectionFailed,
      DiscoveryStep.BluetoothAccessDenied,
      DiscoveryStep.LocationAccessDenied,
      DiscoveryStep.NearbyDevicesDenied,
      DiscoveryStep.PermissionDenied,
    ];

    it.each(errorSteps)('moves %s to searching on RETRY', (step) => {
      expect(
        transition(
          step,
          { type: HardwareWalletDiscoveryEventType.Retry },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.Searching);
    });

    it.each(errorSteps)('stays %s on irrelevant events', (step) => {
      expect(
        transition(
          step,
          {
            type: HardwareWalletDiscoveryEventType.DeviceFound,
            device: DEVICE,
          },
          mockConfig,
        ),
      ).toBe(step);
      expect(
        transition(
          step,
          { type: HardwareWalletDiscoveryEventType.Timeout },
          mockConfig,
        ),
      ).toBe(step);
    });
  });

  describe('CONNECT_ERROR', () => {
    it('maps to the configured step for known error codes', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.DeviceLocked);
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.DeviceStateEthAppClosed,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.AppNotOpen);
    });

    it('falls back to not-found for unmapped error codes', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.Unknown,
          },
          mockConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });
  });

  describe('config with empty errorToStepMap', () => {
    const minimalConfig: DeviceUIConfig = {
      ...mockConfig,
      errorToStepMap: {},
    };

    it('falls back to permission-denied for any PERMISSIONS_DENIED', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.PermissionsDenied,
            errorCode: ErrorCode.PermissionBluetoothDenied,
          },
          minimalConfig,
        ),
      ).toBe(DiscoveryStep.PermissionDenied);
    });

    it('falls back to not-found for any SCAN_ERROR', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ScanError,
            error: new Error('fail'),
          },
          minimalConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });

    it('falls back to not-found for any CONNECT_ERROR', () => {
      expect(
        transition(
          DiscoveryStep.Searching,
          {
            type: HardwareWalletDiscoveryEventType.ConnectError,
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          minimalConfig,
        ),
      ).toBe(DiscoveryStep.NotFound);
    });
  });
});
