import { ErrorCode, HardwareWalletType } from '@metamask/hw-wallet-sdk';
import {
  registerSharedErrors,
  registerWalletErrors,
  resetRegistry,
  resolveErrorComponent,
} from './registry';
import type { ErrorRenderer } from './types';

const MockWalletSpecific = (() => null) as unknown as ErrorRenderer;
const MockShared = (() => null) as unknown as ErrorRenderer;
const MockGeneric = (() => null) as unknown as ErrorRenderer;
const MockDeviceNotFound = (() => null) as unknown as ErrorRenderer;

describe('resolveErrorComponent', () => {
  beforeEach(() => {
    resetRegistry();
    registerSharedErrors(
      {
        [ErrorCode.PermissionBluetoothDenied]: MockShared,
        [ErrorCode.DeviceNotFound]: MockDeviceNotFound,
      },
      MockGeneric,
    );
    registerWalletErrors(HardwareWalletType.Ledger, {
      [ErrorCode.DeviceStateEthAppClosed]: MockWalletSpecific,
    });
  });

  it('returns wallet-specific component when registered for that wallet type', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.DeviceStateEthAppClosed,
    );
    expect(result).toBe(MockWalletSpecific);
  });

  it('returns shared component when no wallet-specific match', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.PermissionBluetoothDenied,
    );
    expect(result).toBe(MockShared);
  });

  it('returns DeviceNotFound when errorCode is undefined', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      undefined as unknown as ErrorCode,
    );
    expect(result).toBe(MockDeviceNotFound);
  });

  it('returns generic fallback for unhandled error codes', () => {
    const result = resolveErrorComponent(
      HardwareWalletType.Ledger,
      ErrorCode.Unknown,
    );
    expect(result).toBe(MockGeneric);
  });

  it('throws when nothing is registered', () => {
    resetRegistry();
    expect(() =>
      resolveErrorComponent(HardwareWalletType.Ledger, ErrorCode.Unknown),
    ).toThrow('No error component registered');
  });
});
