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

// Mock Ledger modules
jest.mock('../../Ledger/Ledger', () => ({
  connectLedgerHardware: jest.fn(),
  openEthereumAppOnLedger: jest.fn(),
  closeRunningAppOnLedger: jest.fn(),
}));

jest.mock('../../Ledger/LedgerDmk', () => ({
  connectLedgerDmkHardware: jest.fn(),
  connectLedgerDmkDevice: jest.fn(),
  getLedgerDmkSessionState: jest.fn(),
  disconnectLedgerDmkSession: jest.fn(),
  listenToLedgerDmkAvailableDevices: jest.fn(),
}));

jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(() => ({})),
    dispatch: jest.fn(),
  },
}));

jest.mock('../../../selectors/featureFlagController', () => ({
  selectRemoteFeatureFlags: jest.fn(() => ({})),
}));

jest.mock('../../Ledger/dmk', () => ({
  isDmkEnabled: jest.fn(() => false),
}));

// Mock Eth app
jest.mock('@ledgerhq/hw-app-eth', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getAddress: jest.fn(),
  })),
}));

import { createAdapter } from './factory';
import { HardwareWalletType, ErrorCode } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';
import { QRWalletAdapter } from './QRWalletAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';
import { isDmkEnabled } from '../../Ledger/dmk';

describe('createAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isDmkEnabled).mockReturnValue(false);
  });

  it('creates LedgerBluetoothAdapter for Ledger wallet type when DMK is off', () => {
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions);
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('creates LedgerBluetoothDMKAdapter for Ledger when enableDmk is true', () => {
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions, true);
    expect(adapter).toBeInstanceOf(LedgerBluetoothDMKAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('creates LedgerBluetoothDMKAdapter when store flag enables DMK', () => {
    jest.mocked(isDmkEnabled).mockReturnValue(true);
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions);
    expect(adapter).toBeInstanceOf(LedgerBluetoothDMKAdapter);
  });

  it('creates QRWalletAdapter for QR wallet type', () => {
    const adapter = createAdapter(HardwareWalletType.Qr, mockOptions, false);
    expect(adapter).toBeInstanceOf(QRWalletAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Qr);
  });

  it('creates NonHardwareAdapter for null wallet type', () => {
    const adapter = createAdapter(null, mockOptions, false);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('creates NonHardwareAdapter for unsupported wallet type', () => {
    const adapter = createAdapter(
      // @ts-expect-error - Testing unsupported type
      'unknown',
      mockOptions,
      false,
    );
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('NonHardwareAdapter ensureDeviceReady returns true', async () => {
    const adapter = createAdapter(null, mockOptions, false);
    const result = await adapter.ensureDeviceReady('any-device-id');
    expect(result).toBe(true);
  });

  it('selects DMK adapter when enableDmk is true (e.g. local override enabled at call site)', () => {
    // The call site resolves `enableDmk` via `isDmkEnabled(Engine.controllerMessenger)`,
    // which honors local overrides. When that resolves to `true`, the factory
    // must select the DMK adapter.
    const adapter = createAdapter(HardwareWalletType.Ledger, mockOptions, true);
    expect(adapter).toBeInstanceOf(LedgerBluetoothDMKAdapter);
  });

  it('selects legacy adapter when enableDmk is false', () => {
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      false,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
  });
});

describe('adapter transport properties', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('LedgerBluetoothAdapter returns BluetoothDisabled error code for transport', () => {
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      false,
    );
    expect(adapter.getTransportDisabledErrorCode()).toBe(
      ErrorCode.BluetoothDisabled,
    );
  });

  it('NonHardwareAdapter returns null for transport error code', () => {
    const adapter = createAdapter(null, mockOptions, false);
    expect(adapter.getTransportDisabledErrorCode()).toBeNull();
  });
});
