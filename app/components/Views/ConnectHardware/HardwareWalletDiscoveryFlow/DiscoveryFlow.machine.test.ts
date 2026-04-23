import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { transition } from './DiscoveryFlow.machine';
import type {
  DiscoveryStep,
  MachineEvent,
  DeviceUIConfig,
} from './DiscoveryFlow.types';

const mockConfig: DeviceUIConfig = {
  walletType: HardwareWalletType.Ledger,
  discoveryTimeoutMs: 15000,
  animationSource: 0,
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
  deviceIcon: 'smartphone',
  troubleshootingItems: [],
  errorToStepMap: {
    [ErrorCode.AuthenticationDeviceLocked]: 'device-locked',
    [ErrorCode.DeviceUnresponsive]: 'device-unresponsive',
    [ErrorCode.DeviceStateEthAppClosed]: 'app-not-open',
    [ErrorCode.BluetoothDisabled]: 'transport-unavailable',
    [ErrorCode.BluetoothConnectionFailed]: 'transport-connection-failed',
    [ErrorCode.BluetoothScanFailed]: 'transport-connection-failed',
    [ErrorCode.PermissionBluetoothDenied]: 'permission-denied',
    [ErrorCode.PermissionLocationDenied]: 'permission-denied',
    [ErrorCode.PermissionNearbyDevicesDenied]: 'permission-denied',
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
        transition('searching', { type: 'PERMISSIONS_GRANTED' }, mockConfig),
      ).toBe('searching');
    });

    it('moves to permission-denied on PERMISSIONS_DENIED with mapped error', () => {
      expect(
        transition(
          'searching',
          {
            type: 'PERMISSIONS_DENIED',
            errorCode: ErrorCode.PermissionBluetoothDenied,
          },
          mockConfig,
        ),
      ).toBe('permission-denied');
    });

    it('falls back to permission-denied for unmapped permission errors', () => {
      expect(
        transition(
          'searching',
          {
            type: 'PERMISSIONS_DENIED',
            errorCode: ErrorCode.PermissionLocationDenied,
          },
          mockConfig,
        ),
      ).toBe('permission-denied');
    });

    it('moves to found on DEVICE_FOUND', () => {
      expect(
        transition(
          'searching',
          { type: 'DEVICE_FOUND', device: DEVICE },
          mockConfig,
        ),
      ).toBe('found');
    });

    it('moves to not-found on TIMEOUT', () => {
      expect(transition('searching', { type: 'TIMEOUT' }, mockConfig)).toBe(
        'not-found',
      );
    });

    it('moves to transport-connection-failed on SCAN_ERROR with mapped bluetooth error', () => {
      expect(
        transition(
          'searching',
          {
            type: 'SCAN_ERROR',
            error: Object.assign(new Error('BLE failed'), { name: 'BleError' }),
          },
          mockConfig,
        ),
      ).toBe('transport-connection-failed');
    });

    it('falls back to not-found on SCAN_ERROR with unmapped error', () => {
      expect(
        transition(
          'searching',
          { type: 'SCAN_ERROR', error: new Error('unknown') },
          mockConfig,
        ),
      ).toBe('not-found');
    });

    it('moves to transport-unavailable on TRANSPORT_UNAVAILABLE', () => {
      expect(
        transition('searching', { type: 'TRANSPORT_UNAVAILABLE' }, mockConfig),
      ).toBe('transport-unavailable');
    });

    it('stays searching on TRANSPORT_AVAILABLE', () => {
      expect(
        transition('searching', { type: 'TRANSPORT_AVAILABLE' }, mockConfig),
      ).toBe('searching');
    });

    it('returns current step for irrelevant events', () => {
      expect(transition('searching', { type: 'RETRY' }, mockConfig)).toBe(
        'searching',
      );
      expect(transition('searching', { type: 'BACK' }, mockConfig)).toBe(
        'searching',
      );
    });
  });

  describe('found state', () => {
    it('moves to accounts on OPEN_ACCOUNTS', () => {
      expect(
        transition(
          'found',
          { type: 'OPEN_ACCOUNTS', device: DEVICE },
          mockConfig,
        ),
      ).toBe('accounts');
    });

    it('stays found on DEVICE_FOUND (additional device)', () => {
      expect(
        transition(
          'found',
          { type: 'DEVICE_FOUND', device: DEVICE },
          mockConfig,
        ),
      ).toBe('found');
    });

    it('maps to configured error step on CONNECT_ERROR', () => {
      expect(
        transition(
          'found',
          {
            type: 'CONNECT_ERROR',
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          mockConfig,
        ),
      ).toBe('device-locked');
    });

    it('falls back to not-found on unmapped CONNECT_ERROR', () => {
      expect(
        transition(
          'found',
          { type: 'CONNECT_ERROR', errorCode: ErrorCode.Unknown },
          mockConfig,
        ),
      ).toBe('not-found');
    });

    it('returns current step for irrelevant events', () => {
      expect(transition('found', { type: 'TIMEOUT' }, mockConfig)).toBe(
        'found',
      );
    });
  });

  describe('accounts state', () => {
    it('stays accounts on most events', () => {
      expect(transition('accounts', { type: 'TIMEOUT' }, mockConfig)).toBe(
        'accounts',
      );
      expect(
        transition(
          'accounts',
          { type: 'DEVICE_FOUND', device: DEVICE },
          mockConfig,
        ),
      ).toBe('accounts');
    });

    it('moves to found on BACK', () => {
      expect(transition('accounts', { type: 'BACK' }, mockConfig)).toBe(
        'found',
      );
    });

    it('moves to searching on RETRY', () => {
      expect(transition('accounts', { type: 'RETRY' }, mockConfig)).toBe(
        'searching',
      );
    });
  });

  describe('not-found state', () => {
    it('moves to searching on RETRY', () => {
      expect(transition('not-found', { type: 'RETRY' }, mockConfig)).toBe(
        'searching',
      );
    });

    it('stays not-found on other events', () => {
      expect(transition('not-found', { type: 'TIMEOUT' }, mockConfig)).toBe(
        'not-found',
      );
    });
  });

  describe('error states', () => {
    const errorSteps: DiscoveryStep[] = [
      'device-locked',
      'device-unresponsive',
      'app-not-open',
      'transport-unavailable',
      'transport-connection-failed',
      'permission-denied',
    ];

    it.each(errorSteps)('moves %s to searching on RETRY', (step) => {
      expect(transition(step, { type: 'RETRY' }, mockConfig)).toBe('searching');
    });

    it.each(errorSteps)('stays %s on irrelevant events', (step) => {
      expect(
        transition(step, { type: 'DEVICE_FOUND', device: DEVICE }, mockConfig),
      ).toBe(step);
      expect(transition(step, { type: 'TIMEOUT' }, mockConfig)).toBe(step);
    });
  });

  describe('CONNECT_ERROR', () => {
    it('maps to the configured step for known error codes', () => {
      expect(
        transition(
          'searching',
          {
            type: 'CONNECT_ERROR',
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          mockConfig,
        ),
      ).toBe('device-locked');
      expect(
        transition(
          'searching',
          {
            type: 'CONNECT_ERROR',
            errorCode: ErrorCode.DeviceStateEthAppClosed,
          },
          mockConfig,
        ),
      ).toBe('app-not-open');
    });

    it('falls back to not-found for unmapped error codes', () => {
      expect(
        transition(
          'searching',
          { type: 'CONNECT_ERROR', errorCode: ErrorCode.Unknown },
          mockConfig,
        ),
      ).toBe('not-found');
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
          'searching',
          {
            type: 'PERMISSIONS_DENIED',
            errorCode: ErrorCode.PermissionBluetoothDenied,
          },
          minimalConfig,
        ),
      ).toBe('permission-denied');
    });

    it('falls back to not-found for any SCAN_ERROR', () => {
      expect(
        transition(
          'searching',
          { type: 'SCAN_ERROR', error: new Error('fail') },
          minimalConfig,
        ),
      ).toBe('not-found');
    });

    it('falls back to not-found for any CONNECT_ERROR', () => {
      expect(
        transition(
          'searching',
          {
            type: 'CONNECT_ERROR',
            errorCode: ErrorCode.AuthenticationDeviceLocked,
          },
          minimalConfig,
        ),
      ).toBe('not-found');
    });
  });
});
