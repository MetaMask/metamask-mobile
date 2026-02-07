import {
  DeviceEvent,
  BluetoothPermissionState,
  LocationPermissionState,
  isDeviceEventPayload,
  canAttemptConnection,
  type DeviceEventPayload,
  type HardwareWalletPermissions,
} from './types';

describe('DeviceEvent enum', () => {
  it('should have all expected event values', () => {
    expect(DeviceEvent.Connected).toBe('connected');
    expect(DeviceEvent.Disconnected).toBe('disconnected');
    expect(DeviceEvent.AppOpened).toBe('app_opened');
    expect(DeviceEvent.AppClosed).toBe('app_closed');
    expect(DeviceEvent.ConfirmationRequired).toBe('confirmation_required');
    expect(DeviceEvent.ConfirmationReceived).toBe('confirmation_received');
    expect(DeviceEvent.ConfirmationRejected).toBe('confirmation_rejected');
    expect(DeviceEvent.OperationTimeout).toBe('operation_timeout');
    expect(DeviceEvent.PermissionChanged).toBe('permission_changed');
  });
});

describe('BluetoothPermissionState enum', () => {
  it('should have all expected values', () => {
    expect(BluetoothPermissionState.Unknown).toBe('unknown');
    expect(BluetoothPermissionState.Granted).toBe('granted');
    expect(BluetoothPermissionState.Denied).toBe('denied');
    expect(BluetoothPermissionState.Unavailable).toBe('unavailable');
  });
});

describe('LocationPermissionState enum', () => {
  it('should have all expected values', () => {
    expect(LocationPermissionState.Unknown).toBe('unknown');
    expect(LocationPermissionState.Granted).toBe('granted');
    expect(LocationPermissionState.Denied).toBe('denied');
    expect(LocationPermissionState.Disabled).toBe('disabled');
  });
});

describe('isDeviceEventPayload', () => {
  it('should return true for valid DeviceEventPayload', () => {
    const payload: DeviceEventPayload = {
      event: DeviceEvent.Connected,
      deviceId: 'device-123',
    };
    expect(isDeviceEventPayload(payload)).toBe(true);
  });

  it('should return true for minimal DeviceEventPayload', () => {
    const payload: DeviceEventPayload = {
      event: DeviceEvent.Disconnected,
    };
    expect(isDeviceEventPayload(payload)).toBe(true);
  });

  it('should return true for DeviceEventPayload with all fields', () => {
    const payload: DeviceEventPayload = {
      event: DeviceEvent.AppOpened,
      deviceId: 'device-123',
      appName: 'Ethereum',
      error: new Error('test'),
      metadata: { foo: 'bar' },
    };
    expect(isDeviceEventPayload(payload)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isDeviceEventPayload(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isDeviceEventPayload(undefined)).toBe(false);
  });

  it('should return false for primitive values', () => {
    expect(isDeviceEventPayload('string')).toBe(false);
    expect(isDeviceEventPayload(123)).toBe(false);
    expect(isDeviceEventPayload(true)).toBe(false);
  });

  it('should return false for object without event property', () => {
    expect(isDeviceEventPayload({ deviceId: 'id' })).toBe(false);
  });

  it('should return false for object with invalid event value', () => {
    expect(isDeviceEventPayload({ event: 'invalid_event' })).toBe(false);
  });
});

describe('canAttemptConnection', () => {
  it('should return true when bluetooth granted and location granted', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Granted,
      location: LocationPermissionState.Granted,
      allGranted: true,
    };
    expect(canAttemptConnection(permissions)).toBe(true);
  });

  it('should return true when bluetooth granted and location unknown', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Granted,
      location: LocationPermissionState.Unknown,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(true);
  });

  it('should return true when bluetooth granted and location disabled', () => {
    // Disabled means services are off, but permission might still be granted
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Granted,
      location: LocationPermissionState.Disabled,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(true);
  });

  it('should return false when bluetooth denied', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Denied,
      location: LocationPermissionState.Granted,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(false);
  });

  it('should return false when bluetooth unavailable', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Unavailable,
      location: LocationPermissionState.Granted,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(false);
  });

  it('should return false when bluetooth unknown', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Unknown,
      location: LocationPermissionState.Granted,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(false);
  });

  it('should return false when location denied', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Granted,
      location: LocationPermissionState.Denied,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(false);
  });

  it('should return false when both bluetooth and location denied', () => {
    const permissions: HardwareWalletPermissions = {
      bluetooth: BluetoothPermissionState.Denied,
      location: LocationPermissionState.Denied,
      allGranted: false,
    };
    expect(canAttemptConnection(permissions)).toBe(false);
  });
});
