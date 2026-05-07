import { QRWalletAdapter } from './QRWalletAdapter';
import { HardwareWalletType, DeviceEvent } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapterOptions } from '../types';

const mockGetCameraPermissionStatus = jest.fn();
const mockRequestCameraPermission = jest.fn();

jest.mock('react-native-vision-camera', () => ({
  Camera: {
    getCameraPermissionStatus: () => mockGetCameraPermissionStatus(),
    requestCameraPermission: () => mockRequestCameraPermission(),
  },
}));

describe('QRWalletAdapter', () => {
  let adapter: QRWalletAdapter;
  let mockOptions: HardwareWalletAdapterOptions;
  let onDisconnect: jest.Mock;
  let onDeviceEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCameraPermissionStatus.mockReturnValue('granted');
    mockRequestCameraPermission.mockResolvedValue('granted');

    onDisconnect = jest.fn();
    onDeviceEvent = jest.fn();

    mockOptions = {
      onDisconnect,
      onDeviceEvent,
    };

    adapter = new QRWalletAdapter(mockOptions);
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('constructor', () => {
    it('creates an instance', () => {
      expect(adapter).toBeInstanceOf(QRWalletAdapter);
    });

    it('has QR walletType', () => {
      expect(adapter.walletType).toBe(HardwareWalletType.Qr);
    });

    it('does NOT require device discovery (unlike Ledger)', () => {
      expect(adapter.requiresDeviceDiscovery).toBe(false);
    });

    it('is not connected initially', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });
  });

  describe('connect', () => {
    it('stores device ID without actual connection', async () => {
      await adapter.connect('qr-account-address');

      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getConnectedDeviceId()).toBe('qr-account-address');
    });

    it('emits Connected event on success', async () => {
      await adapter.connect('qr-account-address');

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Connected,
        deviceId: 'qr-account-address',
      });
    });

    it('throws if adapter is destroyed', async () => {
      adapter.destroy();

      await expect(adapter.connect('qr-account-address')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });
  });

  describe('disconnect', () => {
    it('clears device state', async () => {
      await adapter.connect('qr-account-address');
      await adapter.disconnect();

      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });

    it('emits Disconnected event', async () => {
      await adapter.connect('qr-account-address');
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Disconnected,
        deviceId: 'qr-account-address',
      });
    });

    it('does not emit Disconnected when flow is complete', async () => {
      await adapter.connect('qr-account-address');
      adapter.markFlowComplete();
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expect(onDeviceEvent).not.toHaveBeenCalled();
    });

    it('handles disconnect when not connected', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('ensureDeviceReady', () => {
    it('throws when adapter is destroyed', async () => {
      adapter.destroy();

      await expect(
        adapter.ensureDeviceReady('qr-account-address'),
      ).rejects.toThrow('Adapter has been destroyed');
    });

    it('returns true and emits AppOpened (QR wallets are always ready)', async () => {
      const result = await adapter.ensureDeviceReady('qr-account-address');

      expect(result).toBe(true);
      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.AppOpened,
      });
    });

    it('stores device ID', async () => {
      await adapter.ensureDeviceReady('qr-account-address');

      expect(adapter.getConnectedDeviceId()).toBe('qr-account-address');
      expect(adapter.isConnected()).toBe(true);
    });

    it('emits ConnectionFailed when camera permission is denied', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('denied');

      const result = await adapter.ensureDeviceReady('qr-account-address');

      expect(result).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
      expect(adapter.isConnected()).toBe(false);
      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.ConnectionFailed,
        error: {
          name: 'CameraPermissionDenied',
          message: 'Camera permission is required to scan QR codes',
        },
      });
    });

    it('emits ConnectionFailed when camera permission prompt is denied', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('not-determined');
      mockRequestCameraPermission.mockResolvedValueOnce('denied');

      const result = await adapter.ensureDeviceReady('qr-account-address');

      expect(result).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
      expect(adapter.isConnected()).toBe(false);
      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.ConnectionFailed,
        error: {
          name: 'CameraPermissionDenied',
          message: 'Camera permission is required to scan QR codes',
        },
      });
    });
  });

  describe('reset', () => {
    it('resets adapter state', async () => {
      await adapter.connect('qr-account-address');
      adapter.markFlowComplete();

      adapter.reset();

      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
      expect(adapter.isFlowComplete()).toBe(false);
    });
  });

  describe('markFlowComplete', () => {
    it('marks flow as complete', () => {
      expect(adapter.isFlowComplete()).toBe(false);

      adapter.markFlowComplete();

      expect(adapter.isFlowComplete()).toBe(true);
    });
  });

  describe('resetFlowState', () => {
    it('resets flow complete flag', () => {
      adapter.markFlowComplete();
      expect(adapter.isFlowComplete()).toBe(true);

      adapter.resetFlowState();

      expect(adapter.isFlowComplete()).toBe(false);
    });
  });

  describe('startDeviceDiscovery', () => {
    it('throws when adapter is destroyed', () => {
      adapter.destroy();

      expect(() => adapter.startDeviceDiscovery(jest.fn(), jest.fn())).toThrow(
        'Adapter has been destroyed',
      );
    });

    it('returns cleanup function (no-op for QR)', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      const cleanup = adapter.startDeviceDiscovery(onDeviceFound, onError);

      expect(typeof cleanup).toBe('function');
      // Should NOT call onError for QR wallets (no discovery needed)
      expect(onError).not.toHaveBeenCalled();
    });

    it('cleanup function is a no-op', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      const cleanup = adapter.startDeviceDiscovery(onDeviceFound, onError);

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('stopDeviceDiscovery', () => {
    it('handles being called (no-op for QR)', () => {
      expect(() => adapter.stopDeviceDiscovery()).not.toThrow();
    });
  });

  describe('ensurePermissions', () => {
    it('checks and requests camera permission when needed', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('not-determined');
      mockRequestCameraPermission.mockResolvedValueOnce('granted');

      const result = await adapter.ensurePermissions();

      expect(result).toBe(true);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).toHaveBeenCalledTimes(1);
    });

    it('emits ConnectionFailed when the permission prompt is denied', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('not-determined');
      mockRequestCameraPermission.mockResolvedValueOnce('denied');

      const result = await adapter.ensurePermissions();

      expect(result).toBe(false);
      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.ConnectionFailed,
        error: {
          name: 'CameraPermissionDenied',
          message: 'Camera permission is required to scan QR codes',
        },
      });
    });
  });

  describe('isTransportAvailable', () => {
    it('returns true when camera permission is granted', async () => {
      const result = await adapter.isTransportAvailable();

      expect(result).toBe(true);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).not.toHaveBeenCalled();
      expect(onDeviceEvent).not.toHaveBeenCalled();
    });

    it('returns false when camera permission is not determined', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('not-determined');
      mockRequestCameraPermission.mockResolvedValueOnce('granted');

      const result = await adapter.isTransportAvailable();

      expect(result).toBe(false);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).not.toHaveBeenCalled();
      expect(onDeviceEvent).not.toHaveBeenCalled();
    });

    it('returns false when camera permission is denied', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('denied');

      const result = await adapter.isTransportAvailable();

      expect(result).toBe(false);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).not.toHaveBeenCalled();
      expect(onDeviceEvent).not.toHaveBeenCalled();
    });

    it('does not request camera permission when transport is checked', async () => {
      mockGetCameraPermissionStatus.mockReturnValueOnce('not-determined');
      mockRequestCameraPermission.mockResolvedValueOnce('denied');

      const result = await adapter.isTransportAvailable();

      expect(result).toBe(false);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).not.toHaveBeenCalled();
      expect(onDeviceEvent).not.toHaveBeenCalled();
    });

    it('returns false when camera permission status lookup fails', async () => {
      mockGetCameraPermissionStatus.mockImplementationOnce(() => {
        throw new Error('permission check failed');
      });

      await expect(adapter.isTransportAvailable()).resolves.toBe(false);
      expect(mockGetCameraPermissionStatus).toHaveBeenCalledTimes(1);
      expect(mockRequestCameraPermission).not.toHaveBeenCalled();
      expect(onDeviceEvent).not.toHaveBeenCalled();
    });
  });

  describe('onTransportStateChange', () => {
    it('returns cleanup function (no-op for QR)', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);

      expect(typeof cleanup).toBe('function');
      // Callback is NOT called for QR wallets (no persistent monitoring)
      expect(callback).not.toHaveBeenCalled();
    });

    it('cleanup function is no-op', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);
      cleanup();

      // Should not throw
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getRequiredAppName', () => {
    it('returns undefined (QR wallets have no app concept)', () => {
      expect(adapter.getRequiredAppName()).toBeUndefined();
    });
  });

  describe('getTransportDisabledErrorCode', () => {
    it('returns null because QR does not participate in transport monitoring', () => {
      expect(adapter.getTransportDisabledErrorCode()).toBeNull();
    });
  });

  describe('destroy', () => {
    it('marks as destroyed and cleans up', async () => {
      await adapter.connect('qr-account-address');
      adapter.destroy();

      expect(adapter.isConnected()).toBe(false);
    });

    it('prevents further operations', async () => {
      adapter.destroy();

      await expect(adapter.connect('qr-account-address')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });

    it('prevents device discovery when destroyed', () => {
      adapter.destroy();

      expect(() => adapter.startDeviceDiscovery(jest.fn(), jest.fn())).toThrow(
        'Adapter has been destroyed',
      );
    });
  });

  describe('Key Differences from LedgerBluetoothAdapter', () => {
    it('does NOT require device discovery', () => {
      expect(adapter.requiresDeviceDiscovery).toBe(false);
    });

    it('opts out of transport disabled error monitoring', () => {
      expect(adapter.getTransportDisabledErrorCode()).toBeNull();
    });

    it('does NOT call transport state callback immediately', () => {
      const callback = jest.fn();
      adapter.onTransportStateChange(callback);
      expect(callback).not.toHaveBeenCalled();
    });

    it('has no app concept', () => {
      expect(adapter.getRequiredAppName()).toBeUndefined();
    });
  });
});
