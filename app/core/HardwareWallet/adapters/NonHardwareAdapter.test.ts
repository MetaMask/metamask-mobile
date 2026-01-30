import {
  NonHardwareAdapter,
  isNonHardwareAdapter,
  createNonHardwareAdapter,
} from './NonHardwareAdapter';
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
});

describe('isNonHardwareAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('returns true for NonHardwareAdapter instance', () => {
    const adapter = new NonHardwareAdapter(mockOptions);
    expect(isNonHardwareAdapter(adapter)).toBe(true);
  });

  it('returns false for other adapters', () => {
    // Create a mock adapter that is not a NonHardwareAdapter
    const mockAdapter = {
      walletType: 'ledger',
      connect: jest.fn(),
      disconnect: jest.fn(),
      getConnectedDeviceId: jest.fn(),
      ensureDeviceReady: jest.fn(),
      isConnected: jest.fn(),
      reset: jest.fn(),
      markFlowComplete: jest.fn(),
      isFlowComplete: jest.fn(),
      resetFlowState: jest.fn(),
    };
    expect(isNonHardwareAdapter(mockAdapter as never)).toBe(false);
  });
});

describe('createNonHardwareAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('creates a NonHardwareAdapter instance', () => {
    const adapter = createNonHardwareAdapter(mockOptions);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
  });
});
