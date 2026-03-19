import {
  ErrorCode,
  ConnectionStatus,
  HardwareWalletType,
  HardwareWalletError,
  Severity,
  Category,
  type HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';
import {
  HardwareWalletAnalyticsErrorState,
  getAnalyticsErrorState,
  getErrorStateFromConnectionState,
  getAnalyticsDeviceType,
  buildRawErrorString,
} from './types';

describe('analytics types', () => {
  describe('getAnalyticsErrorState', () => {
    it('maps AuthenticationDeviceLocked to Device Locked', () => {
      expect(getAnalyticsErrorState(ErrorCode.AuthenticationDeviceLocked)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceLocked,
      );
    });

    it('maps AuthenticationDeviceBlocked to Device Locked', () => {
      expect(
        getAnalyticsErrorState(ErrorCode.AuthenticationDeviceBlocked),
      ).toBe(HardwareWalletAnalyticsErrorState.DeviceLocked);
    });

    it('maps DeviceDisconnected to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceDisconnected)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps DeviceNotFound to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceNotFound)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps DeviceNotReady to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceNotReady)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps DeviceUnresponsive to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceUnresponsive)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps ConnectionClosed to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.ConnectionClosed)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps ConnectionTimeout to Device Disconnected', () => {
      expect(getAnalyticsErrorState(ErrorCode.ConnectionTimeout)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('maps DeviceStateEthAppClosed to Ethereum App Not Opened', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceStateEthAppClosed)).toBe(
        HardwareWalletAnalyticsErrorState.EthereumAppNotOpened,
      );
    });

    it('maps DeviceMissingCapability to Ethereum App Not Opened', () => {
      expect(getAnalyticsErrorState(ErrorCode.DeviceMissingCapability)).toBe(
        HardwareWalletAnalyticsErrorState.EthereumAppNotOpened,
      );
    });

    it('maps BluetoothDisabled to Bluetooth Disabled', () => {
      expect(getAnalyticsErrorState(ErrorCode.BluetoothDisabled)).toBe(
        HardwareWalletAnalyticsErrorState.BluetoothDisabled,
      );
    });

    it('maps PermissionBluetoothDenied to Bluetooth Disabled', () => {
      expect(getAnalyticsErrorState(ErrorCode.PermissionBluetoothDenied)).toBe(
        HardwareWalletAnalyticsErrorState.BluetoothDisabled,
      );
    });

    it('maps DeviceStateBlindSignNotSupported to Blind Signing Not Enabled', () => {
      expect(
        getAnalyticsErrorState(ErrorCode.DeviceStateBlindSignNotSupported),
      ).toBe(HardwareWalletAnalyticsErrorState.BlindSigningNotEnabled);
    });

    it('maps Unknown to Generic Error', () => {
      expect(getAnalyticsErrorState(ErrorCode.Unknown)).toBe(
        HardwareWalletAnalyticsErrorState.GenericError,
      );
    });

    it('maps UserRejected to Generic Error', () => {
      expect(getAnalyticsErrorState(ErrorCode.UserRejected)).toBe(
        HardwareWalletAnalyticsErrorState.GenericError,
      );
    });

    it('maps unmapped codes to Generic Error', () => {
      expect(getAnalyticsErrorState(999 as ErrorCode)).toBe(
        HardwareWalletAnalyticsErrorState.GenericError,
      );
    });
  });

  describe('getErrorStateFromConnectionState', () => {
    it('returns error state for ErrorState status', () => {
      const error = new HardwareWalletError('Disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Disconnected',
      });

      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error,
      };

      expect(getErrorStateFromConnectionState(state)).toBe(
        HardwareWalletAnalyticsErrorState.DeviceDisconnected,
      );
    });

    it('returns Ethereum App Not Opened for AwaitingApp status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      expect(getErrorStateFromConnectionState(state)).toBe(
        HardwareWalletAnalyticsErrorState.EthereumAppNotOpened,
      );
    });

    it('returns null for Disconnected status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Disconnected,
      };

      expect(getErrorStateFromConnectionState(state)).toBeNull();
    });

    it('returns null for Ready status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Ready,
      };

      expect(getErrorStateFromConnectionState(state)).toBeNull();
    });

    it('returns null for Connecting status', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Connecting,
      };

      expect(getErrorStateFromConnectionState(state)).toBeNull();
    });
  });

  describe('getAnalyticsDeviceType', () => {
    it('returns Ledger for Ledger type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Ledger)).toBe('Ledger');
    });

    it('returns Trezor for Trezor type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Trezor)).toBe('Trezor');
    });

    it('returns QR Hardware for Qr type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Qr)).toBe('QR Hardware');
    });

    it('returns OneKey for OneKey type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.OneKey)).toBe('OneKey');
    });

    it('returns Lattice for Lattice type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Lattice)).toBe(
        'Lattice',
      );
    });

    it('returns Unknown for null', () => {
      expect(getAnalyticsDeviceType(null)).toBe('Unknown');
    });

    it('returns Unknown for Unknown type', () => {
      expect(getAnalyticsDeviceType(HardwareWalletType.Unknown)).toBe(
        'Unknown',
      );
    });
  });

  describe('buildRawErrorString', () => {
    it('builds string from ErrorState with code and message', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Your device was disconnected',
      });

      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.ErrorState,
        error,
      };

      const result = buildRawErrorString(state);
      expect(result).toContain(`code=${ErrorCode.DeviceDisconnected}`);
      expect(result).toContain('message=Your device was disconnected');
    });

    it('builds string from AwaitingApp state', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
        appName: 'Ethereum',
      };

      const result = buildRawErrorString(state);
      expect(result).toContain('status=awaiting_app');
      expect(result).toContain('appName=Ethereum');
    });

    it('defaults appName to Ethereum when not provided', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-123',
      };

      const result = buildRawErrorString(state);
      expect(result).toContain('appName=Ethereum');
    });

    it('returns empty string for non-error states', () => {
      const state: HardwareWalletConnectionState = {
        status: ConnectionStatus.Disconnected,
      };

      expect(buildRawErrorString(state)).toBe('');
    });
  });
});
