import { renderHook, act } from '@testing-library/react-native';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { useDeviceConnectionFlow } from './useDeviceConnectionFlow';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './useHardwareWalletStateManager';

const createMockRefs = (): HardwareWalletRefs => ({
  adapterRef: { current: null },
  isConnectingRef: { current: false },
  abortControllerRef: { current: null },
  targetWalletTypeRef: { current: null },
});

const createMockSetters = (): HardwareWalletStateSetters => ({
  setConnectionState: jest.fn(),
  setDeviceId: jest.fn(),
  setTargetWalletType: jest.fn(),
});

const createDefaultOptions = (overrides = {}) => ({
  refs: createMockRefs(),
  setters: createMockSetters(),
  walletType: HardwareWalletType.Ledger as HardwareWalletType | null,
  deviceId: null as string | null,
  handleError: jest.fn(),
  updateConnectionState: jest.fn(),
  createAdapterWithCallbacks: jest.fn(),
  initializeAdapter: jest.fn(),
  checkTransportEnabledOrShowError: jest.fn(),
  ...overrides,
});

describe('useDeviceConnectionFlow', () => {
  describe('ensureDeviceReady', () => {
    it('throws when no wallet type is available', async () => {
      const options = createDefaultOptions({ walletType: null });
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      await expect(
        act(() => result.current.ensureDeviceReady()),
      ).rejects.toThrow('ensureDeviceReady called without a wallet type');
    });

    it('uses targetWalletTypeRef when walletType is null', async () => {
      const refs = createMockRefs();
      refs.targetWalletTypeRef.current = HardwareWalletType.Ledger;
      const mockAdapter = {
        walletType: HardwareWalletType.Ledger,
        resetFlowState: jest.fn(),
        isTransportAvailable: jest.fn().mockResolvedValue(true),
        startDeviceDiscovery: jest.fn(),
        stopDeviceDiscovery: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn(),
        getConnectedDeviceId: jest.fn().mockReturnValue('device-123'),
      };
      const createAdapterWithCallbacks = jest.fn().mockReturnValue(mockAdapter);
      const options = createDefaultOptions({
        refs,
        walletType: null,
        deviceId: 'device-123',
        createAdapterWithCallbacks,
        checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(false),
      });

      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      let readyPromise: Promise<boolean>;
      await act(async () => {
        readyPromise = result.current.ensureDeviceReady('device-123');
        await Promise.resolve();
      });

      expect(createAdapterWithCallbacks).toHaveBeenCalledWith(
        HardwareWalletType.Ledger,
      );

      // Resolve the pending readiness promise so it doesn't leak
      await act(async () => {
        result.current.closeFlow();
        await readyPromise!;
      });
    });
  });

  describe('closeFlow', () => {
    it('clears targetWalletType', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      act(() => {
        result.current.closeFlow();
      });

      expect(options.setters.setTargetWalletType).toHaveBeenCalledWith(null);
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });
  });

  describe('handleConnectionSuccess', () => {
    it('does not clear targetWalletType', () => {
      const options = createDefaultOptions();
      const { result } = renderHook(() => useDeviceConnectionFlow(options));

      act(() => {
        result.current.handleConnectionSuccess();
      });

      expect(options.setters.setTargetWalletType).not.toHaveBeenCalled();
      expect(options.updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });
  });
});
