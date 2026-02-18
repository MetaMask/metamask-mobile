// Mock subscription for observeState
const mockBleStateSubscription = {
  unsubscribe: jest.fn(),
};

// Mock the BLE transport before importing adapter
jest.mock('@ledgerhq/react-native-hw-transport-ble', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
    observeState: jest.fn(() => mockBleStateSubscription),
    listen: jest.fn(() => ({ unsubscribe: jest.fn() })),
  },
}));

// Mock Ledger module
jest.mock('../../Ledger/Ledger', () => ({
  connectLedgerHardware: jest.fn(),
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
}));

// Mock Eth app
jest.mock('@ledgerhq/hw-app-eth', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getAddress: jest.fn(),
  })),
}));

import { createAdapter, requiresBluetooth } from './factory';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';

describe('createAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('creates LedgerBluetoothAdapter for Ledger wallet type', () => {
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions);
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('creates NonHardwareAdapter for null wallet type', () => {
    const adapter = createAdapter(null, mockOptions);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('creates NonHardwareAdapter for unsupported wallet type', () => {
    // @ts-expect-error - Testing unsupported type
    const adapter = createAdapter('unknown', mockOptions);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('NonHardwareAdapter ensureDeviceReady returns true', async () => {
    const adapter = createAdapter(null, mockOptions);
    const result = await adapter.ensureDeviceReady('any-device-id');
    expect(result).toBe(true);
  });
});

describe('requiresBluetooth', () => {
  it('returns true for Ledger', () => {
    expect(requiresBluetooth(HardwareWalletType.Ledger)).toBe(true);
  });

  it('returns false for null', () => {
    expect(requiresBluetooth(null)).toBe(false);
  });
});
