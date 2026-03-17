import { NonHardwareAdapter } from './NonHardwareAdapter';
import { HardwareWalletAdapterOptions } from '../types';

describe('NonHardwareAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  let adapter: NonHardwareAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new NonHardwareAdapter(mockOptions);
  });

  describe('constructor', () => {
    it('creates adapter successfully', () => {
      expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    });

    it('has walletType set to null', () => {
      expect(adapter.walletType).toBeNull();
    });
  });

  describe('ensureDeviceReady', () => {
    it('returns true immediately', async () => {
      const result = await adapter.ensureDeviceReady('any-device-id');
      expect(result).toBe(true);
    });

    it('does not call any callbacks', async () => {
      await adapter.ensureDeviceReady('any-device-id');
      expect(mockOptions.onDisconnect).not.toHaveBeenCalled();
      expect(mockOptions.onDeviceEvent).not.toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('is a no-op that resolves', async () => {
      await expect(adapter.connect('device-id')).resolves.toBeUndefined();
    });

    it('does not call any callbacks', async () => {
      await adapter.connect('device-id');
      expect(mockOptions.onDisconnect).not.toHaveBeenCalled();
      expect(mockOptions.onDeviceEvent).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('is a no-op that resolves', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });

    it('does not call any callbacks', async () => {
      await adapter.disconnect();
      expect(mockOptions.onDisconnect).not.toHaveBeenCalled();
      expect(mockOptions.onDeviceEvent).not.toHaveBeenCalled();
    });
  });

  describe('getConnectedDeviceId', () => {
    it('returns null', () => {
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });
  });

  describe('isConnected', () => {
    it('returns true', () => {
      expect(adapter.isConnected()).toBe(true);
    });
  });

  describe('reset', () => {
    it('is a no-op', () => {
      expect(() => adapter.reset()).not.toThrow();
    });
  });

  describe('markFlowComplete', () => {
    it('is a no-op', () => {
      expect(() => adapter.markFlowComplete()).not.toThrow();
    });
  });

  describe('isFlowComplete', () => {
    it('returns true', () => {
      expect(adapter.isFlowComplete()).toBe(true);
    });
  });

  describe('resetFlowState', () => {
    it('is a no-op', () => {
      expect(() => adapter.resetFlowState()).not.toThrow();
    });
  });

  describe('requiresDeviceDiscovery', () => {
    it('returns false', () => {
      expect(adapter.requiresDeviceDiscovery).toBe(false);
    });
  });

  describe('startDeviceDiscovery', () => {
    it('returns a cleanup function', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      const cleanup = adapter.startDeviceDiscovery(onDeviceFound, onError);

      expect(typeof cleanup).toBe('function');
    });

    it('does not call callbacks', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      adapter.startDeviceDiscovery(onDeviceFound, onError);

      expect(onDeviceFound).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('cleanup function is a no-op', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      const cleanup = adapter.startDeviceDiscovery(onDeviceFound, onError);

      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('stopDeviceDiscovery', () => {
    it('is a no-op', () => {
      expect(() => adapter.stopDeviceDiscovery()).not.toThrow();
    });
  });

  describe('isTransportAvailable', () => {
    it('returns true', async () => {
      const result = await adapter.isTransportAvailable();
      expect(result).toBe(true);
    });
  });

  describe('onTransportStateChange', () => {
    it('calls callback immediately with true', () => {
      const callback = jest.fn();

      adapter.onTransportStateChange(callback);

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('returns a cleanup function', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);

      expect(typeof cleanup).toBe('function');
    });

    it('cleanup function is a no-op', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);

      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('getRequiredAppName', () => {
    it('returns undefined', () => {
      expect(adapter.getRequiredAppName()).toBeUndefined();
    });
  });
});
