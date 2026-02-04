import {
  HardwareWalletError,
  ErrorCode,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';
import {
  ConnectionStatus,
  ConnectionState,
  isErrorState,
  hasDeviceId,
  isDeviceConnected,
  isDeviceBusy,
} from './connectionState';

describe('ConnectionStatus', () => {
  it('should have all expected status values', () => {
    expect(ConnectionStatus.Disconnected).toBe('disconnected');
    expect(ConnectionStatus.Connecting).toBe('connecting');
    expect(ConnectionStatus.Connected).toBe('connected');
    expect(ConnectionStatus.AwaitingApp).toBe('awaiting_app');
    expect(ConnectionStatus.AwaitingConfirmation).toBe('awaiting_confirmation');
    expect(ConnectionStatus.ErrorState).toBe('error');
  });
});

describe('ConnectionState factory', () => {
  describe('disconnected', () => {
    it('should create a disconnected state', () => {
      const state = ConnectionState.disconnected();
      expect(state).toEqual({ status: ConnectionStatus.Disconnected });
    });
  });

  describe('connecting', () => {
    it('should create a connecting state without deviceId', () => {
      const state = ConnectionState.connecting();
      expect(state).toEqual({
        status: ConnectionStatus.Connecting,
        deviceId: undefined,
      });
    });

    it('should create a connecting state with deviceId', () => {
      const state = ConnectionState.connecting('device-123');
      expect(state).toEqual({
        status: ConnectionStatus.Connecting,
        deviceId: 'device-123',
      });
    });
  });

  describe('connected', () => {
    it('should create a connected state with deviceId', () => {
      const state = ConnectionState.connected('device-456');
      expect(state).toEqual({
        status: ConnectionStatus.Connected,
        deviceId: 'device-456',
      });
    });
  });

  describe('awaitingApp', () => {
    it('should create an awaiting app state with just deviceId', () => {
      const state = ConnectionState.awaitingApp('device-789');
      expect(state).toEqual({
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-789',
        requiredApp: undefined,
      });
    });

    it('should create an awaiting app state with requiredApp', () => {
      const state = ConnectionState.awaitingApp('device-789', 'Ethereum');
      expect(state).toEqual({
        status: ConnectionStatus.AwaitingApp,
        deviceId: 'device-789',
        requiredApp: 'Ethereum',
      });
    });
  });

  describe('awaitingConfirmation', () => {
    it('should create an awaiting confirmation state with just deviceId', () => {
      const state = ConnectionState.awaitingConfirmation('device-abc');
      expect(state).toEqual({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: 'device-abc',
        operationType: undefined,
      });
    });

    it('should create an awaiting confirmation state with operationType', () => {
      const state = ConnectionState.awaitingConfirmation(
        'device-abc',
        'sign_transaction',
      );
      expect(state).toEqual({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: 'device-abc',
        operationType: 'sign_transaction',
      });
    });
  });

  describe('error', () => {
    it('should create an error state with HardwareWalletError', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });

      const state = ConnectionState.error(error);
      expect(state).toEqual({
        status: ConnectionStatus.ErrorState,
        error,
      });
    });
  });

  describe('success', () => {
    it('should create a success state without deviceId', () => {
      const state = ConnectionState.success();
      expect(state).toEqual({
        status: ConnectionStatus.Success,
        deviceId: undefined,
      });
    });

    it('should create a success state with deviceId', () => {
      const state = ConnectionState.success('device-xyz');
      expect(state).toEqual({
        status: ConnectionStatus.Success,
        deviceId: 'device-xyz',
      });
    });
  });
});

describe('Type guards', () => {
  describe('isErrorState', () => {
    it('should return true for error state', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });
      const state = ConnectionState.error(error);
      expect(isErrorState(state)).toBe(true);
    });

    it('should return false for non-error states', () => {
      expect(isErrorState(ConnectionState.disconnected())).toBe(false);
      expect(isErrorState(ConnectionState.connecting())).toBe(false);
      expect(isErrorState(ConnectionState.connected('id'))).toBe(false);
      expect(isErrorState(ConnectionState.awaitingApp('id'))).toBe(false);
      expect(isErrorState(ConnectionState.awaitingConfirmation('id'))).toBe(
        false,
      );
    });
  });

  describe('hasDeviceId', () => {
    it('should return true for states with deviceId', () => {
      expect(hasDeviceId(ConnectionState.connecting('id'))).toBe(true);
      expect(hasDeviceId(ConnectionState.connected('id'))).toBe(true);
      expect(hasDeviceId(ConnectionState.awaitingApp('id'))).toBe(true);
      expect(hasDeviceId(ConnectionState.awaitingConfirmation('id'))).toBe(
        true,
      );
    });

    it('should return false for states without deviceId', () => {
      expect(hasDeviceId(ConnectionState.disconnected())).toBe(false);
      expect(hasDeviceId(ConnectionState.connecting())).toBe(false);
    });

    it('should return false for error state', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });
      expect(hasDeviceId(ConnectionState.error(error))).toBe(false);
    });
  });

  describe('isDeviceConnected', () => {
    it('should return true for Connected, AwaitingApp, AwaitingConfirmation', () => {
      expect(isDeviceConnected(ConnectionState.connected('id'))).toBe(true);
      expect(isDeviceConnected(ConnectionState.awaitingApp('id'))).toBe(true);
      expect(
        isDeviceConnected(ConnectionState.awaitingConfirmation('id')),
      ).toBe(true);
    });

    it('should return false for Disconnected, Connecting, Error', () => {
      expect(isDeviceConnected(ConnectionState.disconnected())).toBe(false);
      expect(isDeviceConnected(ConnectionState.connecting())).toBe(false);

      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });
      expect(isDeviceConnected(ConnectionState.error(error))).toBe(false);
    });
  });

  describe('isDeviceBusy', () => {
    it('should return true for Connecting, AwaitingApp, AwaitingConfirmation', () => {
      expect(isDeviceBusy(ConnectionState.connecting())).toBe(true);
      expect(isDeviceBusy(ConnectionState.awaitingApp('id'))).toBe(true);
      expect(isDeviceBusy(ConnectionState.awaitingConfirmation('id'))).toBe(
        true,
      );
    });

    it('should return false for Disconnected, Connected, Error', () => {
      expect(isDeviceBusy(ConnectionState.disconnected())).toBe(false);
      expect(isDeviceBusy(ConnectionState.connected('id'))).toBe(false);

      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });
      expect(isDeviceBusy(ConnectionState.error(error))).toBe(false);
    });
  });
});
