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

// Mock device info so hasMinimumRequiredVersion('1.0.0') returns a truthy value
// (compare-versions returns 1 when currentVersion >= minRequiredVersion).
jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.50.0'),
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
import { QRWalletAdapter } from './QRWalletAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';
import type { HasGetState } from '../../Ledger/dmk';

const mockDmkEnabledMessenger = {
  call: jest.fn().mockReturnValue({
    remoteFeatureFlags: {
      enableDMK: { enabled: true, minimumVersion: '1.0.0' },
    },
  }),
} as unknown as HasGetState;

const mockDmkDisabledMessenger = {
  call: jest.fn().mockReturnValue({
    remoteFeatureFlags: {
      enableDMK: { enabled: false, minimumVersion: '1.0.0' },
    },
  }),
} as unknown as HasGetState;

// Dev-tool boolean override: localOverrides takes precedence over the remote flag.
// This is the case the developer-options toggle sets, and the case the messenger
// resolves that a Redux selector cannot.
const mockDmkLocalOverrideTrueMessenger = {
  call: jest.fn().mockReturnValue({
    remoteFeatureFlags: {
      enableDMK: { enabled: false, minimumVersion: '1.0.0' },
    },
    localOverrides: { enableDMK: true },
  }),
} as unknown as HasGetState;

const mockDmkFlagMissingMessenger = {
  call: jest.fn().mockReturnValue({
    remoteFeatureFlags: {},
  }),
} as unknown as HasGetState;

const mockDmkThrowingMessenger = {
  call: jest.fn().mockImplementation(() => {
    throw new Error('messenger failure');
  }),
} as unknown as HasGetState;

describe('createAdapter', () => {
  const mockOptions: HardwareWalletAdapterOptions = {
    onDisconnect: jest.fn(),
    onDeviceEvent: jest.fn(),
  };

  it('creates LedgerBluetoothDMKAdapter for Ledger wallet type when DMK is enabled', () => {
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkEnabledMessenger,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothDMKAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('creates LedgerBluetoothAdapter for Ledger wallet type when DMK is disabled', () => {
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkDisabledMessenger,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Ledger);
  });

  it('creates QRWalletAdapter for QR wallet type', () => {
    const adapter = createAdapter(
      HardwareWalletType.Qr,
      mockOptions,
      mockDmkDisabledMessenger,
    );
    expect(adapter).toBeInstanceOf(QRWalletAdapter);
    expect(adapter.walletType).toBe(HardwareWalletType.Qr);
  });

  it('creates NonHardwareAdapter for null wallet type', () => {
    const adapter = createAdapter(null, mockOptions, mockDmkDisabledMessenger);
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('creates NonHardwareAdapter for unsupported wallet type', () => {
    const adapter = createAdapter(
      // @ts-expect-error - Testing unsupported type
      'unknown',
      mockOptions,
      mockDmkDisabledMessenger,
    );
    expect(adapter).toBeInstanceOf(NonHardwareAdapter);
    expect(adapter.walletType).toBeNull();
  });

  it('NonHardwareAdapter ensureDeviceReady returns true', async () => {
    const adapter = createAdapter(null, mockOptions, mockDmkDisabledMessenger);
    const result = await adapter.ensureDeviceReady('any-device-id');
    expect(result).toBe(true);
  });

  it('returns DMK adapter when local override is boolean true, even if remote flag is disabled', () => {
    // The dev-tool override is the source of truth at runtime. A selector-based
    // approach cannot mirror this resolution (local overrides are merged on the
    // controller, not in the store), so the factory must read the flag through
    // the messenger to honor it.
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkLocalOverrideTrueMessenger,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothDMKAdapter);
  });

  it('falls back to legacy adapter when enableDMK flag is missing from flag state', () => {
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkFlagMissingMessenger,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
  });

  it('falls back to legacy adapter when messenger.call throws', () => {
    // isDmkEnabled swallows messenger errors and returns false. The factory
    // should not propagate a controller-access failure to the caller.
    const adapter = createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkThrowingMessenger,
    );
    expect(adapter).toBeInstanceOf(LedgerBluetoothAdapter);
  });

  it('invokes the messenger to resolve the DMK flag for Ledger wallets', () => {
    createAdapter(
      HardwareWalletType.Ledger,
      mockOptions,
      mockDmkEnabledMessenger,
    );
    expect(mockDmkEnabledMessenger.call).toHaveBeenCalledWith(
      'RemoteFeatureFlagController:getState',
    );
  });

  it('does not invoke the messenger for non-Ledger wallet types', () => {
    const messenger = {
      call: jest.fn().mockReturnValue({}),
    } as unknown as HasGetState;
    createAdapter(null, mockOptions, messenger);
    createAdapter(HardwareWalletType.Qr, mockOptions, messenger);
    expect(messenger.call).not.toHaveBeenCalled();
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
      mockDmkEnabledMessenger,
    );
    expect(adapter.getTransportDisabledErrorCode()).toBe(
      ErrorCode.BluetoothDisabled,
    );
  });

  it('NonHardwareAdapter returns null for transport error code', () => {
    const adapter = createAdapter(null, mockOptions, mockDmkDisabledMessenger);
    expect(adapter.getTransportDisabledErrorCode()).toBeNull();
  });
});
