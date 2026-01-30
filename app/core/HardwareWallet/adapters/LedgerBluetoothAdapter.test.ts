// Mock the BLE transport
const mockTransportInstance = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
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

import {
  LedgerBluetoothAdapter,
  isLedgerBluetoothAdapter,
  createLedgerBluetoothAdapter,
} from './LedgerBluetoothAdapter';
import { HardwareWalletType } from '../helpers';
import { HardwareWalletAdapterOptions, DeviceEvent } from '../types';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../Ledger/Ledger';

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
    mockedTransportBLE.open.mockResolvedValue(mockTransportInstance as any);
  });

  afterEach(() => {
    adapter.destroy();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    });

    it('should have Ledger walletType', () => {
      expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
    });

    it('should not be connected initially', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });
  });

  describe('connect', () => {
    it('should establish BLE connection', async () => {
      await adapter.connect('device-123');

      expect(mockedTransportBLE.open).toHaveBeenCalledWith('device-123');
      expect(adapter.isConnected()).toBe(true);
      expect(adapter.getConnectedDeviceId()).toBe('device-123');
    });

    it('should emit Connected event on success', async () => {
      await adapter.connect('device-123');

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Connected,
        deviceId: 'device-123',
      });
    });

    it('should set up disconnect handler', async () => {
      await adapter.connect('device-123');

      expect(mockTransportInstance.on).toHaveBeenCalledWith(
        'disconnect',
        expect.any(Function),
      );
    });

    it('should not reconnect if already connected to same device', async () => {
      await adapter.connect('device-123');
      await adapter.connect('device-123');

      // Should only open once
      expect(mockedTransportBLE.open).toHaveBeenCalledTimes(1);
    });

    it('should disconnect and reconnect if connecting to different device', async () => {
      await adapter.connect('device-123');
      await adapter.connect('device-456');

      // Should close first connection and open new one
      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(mockedTransportBLE.open).toHaveBeenCalledTimes(2);
    });

    it('should emit ConnectionFailed on error', async () => {
      const error = new Error('BLE connection failed');
      mockedTransportBLE.open.mockRejectedValueOnce(error);

      await expect(adapter.connect('device-123')).rejects.toThrow(error);

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.ConnectionFailed,
        error,
      });
    });

    it('should throw if adapter is destroyed', async () => {
      adapter.destroy();

      await expect(adapter.connect('device-123')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });
  });

  describe('disconnect', () => {
    it('should close transport and reset state', async () => {
      await adapter.connect('device-123');
      await adapter.disconnect();

      expect(mockTransportInstance.close).toHaveBeenCalled();
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.getConnectedDeviceId()).toBeNull();
    });

    it('should emit Disconnected event', async () => {
      await adapter.connect('device-123');
      onDeviceEvent.mockClear();

      await adapter.disconnect();

      expect(onDeviceEvent).toHaveBeenCalledWith({
        event: DeviceEvent.Disconnected,
        deviceId: 'device-123',
      });
    });

    it('should handle disconnect when not connected', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('ensureDeviceReady', () => {
    beforeEach(async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });
    });

    it('should connect if not already connected', async () => {
      await adapter.ensureDeviceReady('device-123');

      expect(mockedTransportBLE.open).toHaveBeenCalledWith('device-123');
    });

    it('should return true when Ethereum app is open and unlocked', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(true);
      expect(mockGetAddress).toHaveBeenCalled();
    });

    it('should emit AppOpened event when correct app is detected and unlocked', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Ethereum');
      mockGetAddress.mockResolvedValue({ address: '0x1234' });

      await adapter.ensureDeviceReady('device-123');

      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppOpened,
          appName: 'Ethereum',
        }),
      );
    });

    it('should return false and emit AppClosed when wrong app is open', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('Bitcoin');

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
      // AppClosed event always uses 'Ethereum' as the required app (what we want opened)
      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppClosed,
          appName: 'Ethereum',
        }),
      );
    });

    it('should return false and emit AppClosed when on BOLOS screen', async () => {
      (connectLedgerHardware as jest.Mock).mockResolvedValue('BOLOS');

      const result = await adapter.ensureDeviceReady('device-123');

      expect(result).toBe(false);
      // AppClosed event always uses 'Ethereum' as the required app
      expect(onDeviceEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: DeviceEvent.AppClosed,
          appName: 'Ethereum',
        }),
      );
    });
  });

  describe('destroy', () => {
    it('should close transport and mark as destroyed', async () => {
      await adapter.connect('device-123');
      adapter.destroy();

      expect(mockTransportInstance.close).toHaveBeenCalled();
    });

    it('should prevent further operations', async () => {
      adapter.destroy();

      await expect(adapter.connect('device-123')).rejects.toThrow(
        'Adapter has been destroyed',
      );
    });
  });
});

describe('isLedgerBluetoothAdapter', () => {
  it('should return true for LedgerBluetoothAdapter', () => {
    const adapter = new LedgerBluetoothAdapter({
      onDisconnect: jest.fn(),
      onDeviceEvent: jest.fn(),
    });

    expect(isLedgerBluetoothAdapter(adapter)).toBe(true);

    adapter.destroy();
  });

  it('should return false for adapters with different walletType', () => {
    const mockAdapter = {
      walletType: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      getConnectedDeviceId: jest.fn(),
      isConnected: jest.fn(),
      ensureDeviceReady: jest.fn(),
      reset: jest.fn(),
      markFlowComplete: jest.fn(),
      isFlowComplete: jest.fn(),
      resetFlowState: jest.fn(),
      destroy: jest.fn(),
    };

    // walletType can be null, so this should return false (not a LedgerBluetoothAdapter)
    expect(isLedgerBluetoothAdapter(mockAdapter)).toBe(false);
  });
});

describe('createLedgerBluetoothAdapter', () => {
  it('should create a LedgerBluetoothAdapter instance', () => {
    const adapter = createLedgerBluetoothAdapter({
      onDisconnect: jest.fn(),
      onDeviceEvent: jest.fn(),
    });

    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);

    adapter.destroy();
  });
});
