import {
  createAdapter,
  getAdapterName,
  requiresBluetooth,
  getSupportedWalletTypes,
} from './factory';
import { HardwareWalletType } from '../helpers';
import { HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';

describe('createAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('should create LedgerBluetoothAdapter for Ledger wallet type', () => {
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions);
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('should create NonHardwareAdapter for null wallet type', () => {
    const adapter = createAdapter(null, mockOptions);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('should create NonHardwareAdapter for unsupported wallet type', () => {
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

describe('getAdapterName', () => {
  it('should return "Ledger" for Ledger wallet type', () => {
    expect(getAdapterName(HardwareWalletType.Ledger)).toBe('Ledger');
  });

  it('should return "Hardware Wallet" for null', () => {
    expect(getAdapterName(null)).toBe('Hardware Wallet');
  });

  it('should return "Hardware Wallet" for unknown types', () => {
    // @ts-expect-error - Testing unknown type
    expect(getAdapterName('unknown')).toBe('Hardware Wallet');
  });
});

describe('requiresBluetooth', () => {
  it('should return true for Ledger', () => {
    expect(requiresBluetooth(HardwareWalletType.Ledger)).toBe(true);
  });

  it('should return false for null', () => {
    expect(requiresBluetooth(null)).toBe(false);
  });
});

describe('getSupportedWalletTypes', () => {
  it('should return array of supported wallet types', () => {
    const types = getSupportedWalletTypes();

    expect(Array.isArray(types)).toBe(true);
    expect(types).toContain(HardwareWalletType.Ledger);
  });

  it('should not include null', () => {
    const types = getSupportedWalletTypes();
    expect(types).not.toContain(null);
  });
});
