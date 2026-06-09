import { renderHook } from '@testing-library/react-native';
import {
  ConnectionStatus,
  ErrorCode,
  HardwareWalletConnectionState,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter } from '../types';
import { useTransportMonitoring } from './useTransportMonitoring';

describe('useTransportMonitoring', () => {
  const createConnectionState = (
    status: ConnectionStatus,
  ): HardwareWalletConnectionState =>
    ({ status }) as HardwareWalletConnectionState;

  const createAdapter = (
    overrides: Partial<HardwareWalletAdapter> = {},
  ): HardwareWalletAdapter => ({
    walletType: HardwareWalletType.Ledger,
    requiresDeviceDiscovery: false,
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getConnectedDeviceId: jest.fn().mockReturnValue(null),
    ensureDeviceReady: jest.fn().mockResolvedValue(true),
    isConnected: jest.fn().mockReturnValue(false),
    reset: jest.fn(),
    markFlowComplete: jest.fn(),
    isFlowComplete: jest.fn().mockReturnValue(false),
    resetFlowState: jest.fn(),
    startDeviceDiscovery: jest.fn(() => jest.fn()),
    stopDeviceDiscovery: jest.fn(),
    ensurePermissions: jest.fn().mockResolvedValue(true),
    isTransportAvailable: jest.fn().mockResolvedValue(true),
    onTransportStateChange: jest.fn(() => jest.fn()),
    getRequiredAppName: jest.fn().mockReturnValue(undefined),
    getTransportDisabledErrorCode: jest
      .fn()
      .mockReturnValue(ErrorCode.BluetoothDisabled),
    ...overrides,
  });

  const createOptions = (overrides = {}) => ({
    isTransportAvailable: true,
    previousTransportAvailableRef: { current: null as boolean | null },
    connectionState: createConnectionState(ConnectionStatus.Disconnected),
    adapterRef: {
      current: createAdapter(),
    },
    walletType: HardwareWalletType.Ledger as HardwareWalletType | null,
    updateConnectionState: jest.fn(),
    ...overrides,
  });

  it('skips transport preflight for adapters that opt out of transport monitoring', async () => {
    const adapter = createAdapter({
      walletType: HardwareWalletType.Qr,
      getTransportDisabledErrorCode: jest.fn().mockReturnValue(null),
      isTransportAvailable: jest.fn().mockResolvedValue(false),
    });
    const options = createOptions({
      adapterRef: { current: adapter },
      walletType: HardwareWalletType.Qr,
    });

    const { result } = renderHook(() => useTransportMonitoring(options));

    await expect(
      result.current.checkTransportEnabledOrShowError(adapter),
    ).resolves.toBe(false);
    expect(adapter.isTransportAvailable).not.toHaveBeenCalled();
    expect(options.updateConnectionState).not.toHaveBeenCalled();
  });

  it('shows an error when monitored transport is unavailable', async () => {
    const adapter = createAdapter({
      isTransportAvailable: jest.fn().mockResolvedValue(false),
    });
    const options = createOptions({
      adapterRef: { current: adapter },
    });

    const { result } = renderHook(() => useTransportMonitoring(options));

    await expect(
      result.current.checkTransportEnabledOrShowError(adapter),
    ).resolves.toBe(true);
    expect(adapter.isTransportAvailable).toHaveBeenCalledTimes(1);
    expect(options.updateConnectionState).toHaveBeenCalledWith({
      status: ConnectionStatus.ErrorState,
      error: expect.objectContaining({
        code: ErrorCode.BluetoothDisabled,
      }),
    });
  });

  it('ignores transport state transitions for adapters that opt out', () => {
    const options = createOptions({
      isTransportAvailable: false,
      previousTransportAvailableRef: { current: true },
      connectionState: createConnectionState(ConnectionStatus.Connected),
      adapterRef: {
        current: createAdapter({
          walletType: HardwareWalletType.Qr,
          getTransportDisabledErrorCode: jest.fn().mockReturnValue(null),
          isTransportAvailable: jest.fn().mockResolvedValue(true),
        }),
      },
      walletType: HardwareWalletType.Qr,
    });

    renderHook(() => useTransportMonitoring(options));

    expect(options.updateConnectionState).not.toHaveBeenCalled();
  });
});
