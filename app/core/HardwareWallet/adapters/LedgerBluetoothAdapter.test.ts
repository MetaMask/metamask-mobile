// Mock subscription for observeState
const mockBleStateSubscription = {
  unsubscribe: jest.fn(),
};

// Mock subscription for listen
const mockListenSubscription = {
  unsubscribe: jest.fn(),
};

// Mock the BLE transport
const mockTransportInstance = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

// Capture the BLE state observer so tests can trigger state changes
let capturedBleStateObserver: {
  next?: (event: { type: string; available: boolean }) => void;
  error?: (error: Error) => void;
  complete?: () => void;
} | null = null;

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    observeState: jest.fn((observer) => {
      capturedBleStateObserver = observer;
      // Immediately trigger with PoweredOn state for most tests
      if (observer.next) {
        observer.next({ type: 'PoweredOn', available: true });
      }
      return mockBleStateSubscription;
    }),
    listen: jest.fn(() => mockListenSubscription),
  },
}));

// Mock the Eth app
const mockGetAddress = jest.fn();
jest.mock('@ledgerhq/hw-app-eth', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getAddress: mockGetAddress,
  })),
}));

// Mock the Ledger module
jest.mock('../../Ledger/Ledger', () => ({
  connectLedgerHardware: jest.fn(),
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
}));

import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { HardwareWalletType, DeviceEvent } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapterOptions } from '../types';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { connectLedgerHardware } from '../../Ledger/Ledger';

const mockedTransportBLE = jest.mocked(TransportBLE);

describe('LedgerBluetoothAdapter', () => {
  let adapter: LedgerBluetoothAdapter;
  let mockOptions: HardwareWalletAdapterOptions;
  let onDisconnect: jest.Mock;
  let onDeviceEvent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    onDisconnect = jest.fn();
    onDeviceEvent = jest.fn();

    mockOptions = {
      onDisconnect,
      onDeviceEvent,
    };

    adapter = new LedgerBluetoothAdapter(mockOptions);

    // Setup transport mock to return our mockTransportInstance
    mockedTransportBLE.open.mockResolvedValue(
      mockTransportInstance as unknown as TransportBLE,
    );
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('constructor', () => {
    it('creates an instance', () => {
      expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    });

    it('has Ledger walletType', () => {
      expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
    });

    it('is not connected initially', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });
  });

  describe('connect', () => {
    it('establishes BLE connection', async () => {
      await adapter.connect('device-123');

      expect(mockedTransportBLE.open).toHaveBeenCalledWith('device-123');
      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getConnectedDeviceId()).toBe('device-123');
    });

    it('emits Connected event on success', async () => {
      await adapter.connect('device-123');

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Connected,
        deviceId: 'device-123',
      });
    });

    it('sets up disconnect handler', async () => {
      await adapter.connect('device-123');

      expect(mockTransportInstance.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });

    it('does not reconnect if already connected to same device', async () => {
      await adapter.connect('device-123');
      await adapter.connect('device-123');

      // Should only open once
      expect(mockedTransportBLE.open).toHaveBeenCalledTimes(1);
    });

    it('disconnects and reconnects if connecting to different device', async () => {
      await adapter.connect('device-123');
      await adapter.connect('device-456');

      // Should close first connection and open new one
      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(mockedTransportBLE.open).toHaveBeenCalledTimes(2);
    });

    it('emits ConnectionFailed on error', async () => {
      const error = new Error('BLE connection failed');
      mockedTransportBLE.open.mockRejectedValueOnce(error);

      await expect(adapter.connect('device-123')).rejects.toThrow(error);

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.ConnectionFailed,
        error,
      });
    });

    it('throws if adapter is destroyed', async () => {
      adapter.destroy();

      await expect(adapter.connect('device-123')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });
  });

  describe('disconnect', () => {
    it('closes transport and resets state', async () => {
      await adapter.connect('device-123');
      await adapter.disconnect();

      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });

    it('emits Disconnected event', async () => {
      await adapter.connect('device-123');
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Disconnected,
        deviceId: 'device-123',
      });
    });

    it('handles disconnect when not connected', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('ensureDeviceReady', () => {
    beforeEach(async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });
    });

    it('connects if not already connected', async () => {
      await adapter.ensureDeviceReady('device-123');

      expect(mockedTransportBLE.open).toHaveBeenCalledWith('device-123');
    });

    it('returns true when Ethereum app is open and unlocked', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(true);
      expect(mockGetAddress).toHaveBeenCalled();
    });

    it('emits AppOpened event when correct app is detected and unlocked', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });

      await adapter.ensureDeviceReady('device-123');

      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppOpened,
          currentAppName: 'Ethereum',
        }),
      );
    });

    it('returns false and emits AppClosed when wrong app is open', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Bitcoin');

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
      // AppClosed event always uses 'Ethereum' as the required app (what we want opened)
      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppNotOpen,
          currentAppName: 'Ethereum',
        }),
      );
    });

    it('returns false and emits AppClosed when on BOLOS screen', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('BOLOS');

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
      // AppClosed event always uses 'Ethereum' as the required app
      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppNotOpen,
          currentAppName: 'Ethereum',
        }),
      );
    });

    it('emits DeviceLocked when device is locked', async () => {
      const lockedError = new Error('Device locked');
      (lockedError as { statusCode?: number }).statusCode = 0x6b0c;
      (lockedError as { name?: string }).name = 'TransportStatusError';
      mockGetAddress.mockRejectedValueOnce(lockedError);
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.DeviceLocked,
        }),
      );
    });

    it('returns false when no transport after connect', async () => {
      // Mock connect to succeed but leave transport as null
      mockedTransportBLE.open.mockResolvedValueOnce(
        null as unknown as TransportBLE,
      );

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets adapter state', async () => {
      await adapter.connect('device-123');
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
    it('starts BLE scanning', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      adapter.startDeviceDiscovery(onDeviceFound, onError);

      // Should have subscribed to the listen observable
      expect(mockListenSubscription.unsubscribe).not.toHaveBeenCalled();
    });

    it('returns cleanup function', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      const cleanup = adapter.startDeviceDiscovery(onDeviceFound, onError);

      expect(typeof cleanup).toBe('function');
      cleanup();
      expect(mockListenSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('stopDeviceDiscovery', () => {
    it('stops any active scan', () => {
      const onDeviceFound = jest.fn();
      const onError = jest.fn();

      adapter.startDeviceDiscovery(onDeviceFound, onError);
      adapter.stopDeviceDiscovery();

      expect(mockListenSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('handles being called when no scan is active', () => {
      // Should not throw
      expect(() => adapter.stopDeviceDiscovery()).not.toThrow();
    });
  });

  describe('isTransportAvailable', () => {
    it('returns current Bluetooth state', async () => {
      // Mock fires with PoweredOn immediately, so should return true
      const result = await adapter.isTransportAvailable();

      expect(result).toBe(true);
    });

    it('returns false when Bluetooth is off', async () => {
      // Create a new adapter and manually trigger PoweredOff state
      const newAdapter = new LedgerBluetoothAdapter(mockOptions);

      // The mock triggers PoweredOn by default, but we can check the behavior
      // by verifying the adapter responds to state changes
      if (capturedBleStateObserver?.next) {
        capturedBleStateObserver.next({ type: 'PoweredOff', available: false });
      }

      const result = await newAdapter.isTransportAvailable();
      expect(result).toBe(false);

      newAdapter.destroy();
    });
  });

  describe('onTransportStateChange', () => {
    it('registers callback and calls immediately with current state', () => {
      const callback = jest.fn();

      adapter.onTransportStateChange(callback);

      // Should be called immediately with current state
      expect(callback).toHaveBeenCalledWith(expect.any(Boolean));
    });

    it('returns cleanup function', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);

      expect(typeof cleanup).toBe('function');
    });

    it('unsubscribes when cleanup is called', () => {
      const callback = jest.fn();

      const cleanup = adapter.onTransportStateChange(callback);
      cleanup();

      // Callback should only have been called once (initial call)
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRequiredAppName', () => {
    it('returns Ethereum', () => {
      expect(adapter.getRequiredAppName()).toBe('Ethereum');
    });
  });

  describe('requiresDeviceDiscovery', () => {
    it('is true for Ledger adapter', () => {
      expect(adapter.requiresDeviceDiscovery).toBe(true);
    });
  });

  describe('destroy', () => {
    it('closes transport and marks as destroyed', async () => {
      await adapter.connect('device-123');
      adapter.destroy();

      expect(mockTransportInstance.close).toHaveBeenCalled();
    });

    it('prevents further operations', async () => {
      adapter.destroy();

      await expect(adapter.connect('device-123')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });
  });
});
