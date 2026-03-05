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

describe('useDeviceConnectionFlow', () => {
  describe('ensureDeviceReady', () => {
    it('throws when no wallet type is available', async () => {
      const refs = createMockRefs();
      const setters = createMockSetters();

      const { result } = renderHook(() =>
        useDeviceConnectionFlow({
          refs,
          setters,
          walletType: null,
          deviceId: null,
          handleError: jest.fn(),
          updateConnectionState: jest.fn(),
          createAdapterWithCallbacks: jest.fn(),
          initializeAdapter: jest.fn(),
          checkTransportEnabledOrShowError: jest.fn(),
        }),
      );

      await expect(
        act(() => result.current.ensureDeviceReady()),
      ).rejects.toThrow('ensureDeviceReady called without a wallet type');
    });

    it('uses targetWalletTypeRef when walletType is null', async () => {
      const refs = createMockRefs();
      refs.targetWalletTypeRef.current = HardwareWalletType.Ledger;
      const setters = createMockSetters();
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

      renderHook(() =>
        useDeviceConnectionFlow({
          refs,
          setters,
          walletType: null,
          deviceId: 'device-123',
          handleError: jest.fn(),
          updateConnectionState: jest.fn(),
          createAdapterWithCallbacks,
          initializeAdapter: jest.fn(),
          checkTransportEnabledOrShowError: jest.fn().mockResolvedValue(false),
        }),
      );

      expect(createAdapterWithCallbacks).not.toHaveBeenCalled();
    });
  });

  describe('closeFlow', () => {
    it('clears targetWalletType', () => {
      const refs = createMockRefs();
      const setters = createMockSetters();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useDeviceConnectionFlow({
          refs,
          setters,
          walletType: HardwareWalletType.Ledger,
          deviceId: null,
          handleError: jest.fn(),
          updateConnectionState,
          createAdapterWithCallbacks: jest.fn(),
          initializeAdapter: jest.fn(),
          checkTransportEnabledOrShowError: jest.fn(),
        }),
      );

      act(() => {
        result.current.closeFlow();
      });

      expect(setters.setTargetWalletType).toHaveBeenCalledWith(null);
      expect(updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });
  });

  describe('handleConnectionSuccess', () => {
    it('does not clear targetWalletType', () => {
      const refs = createMockRefs();
      const setters = createMockSetters();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useDeviceConnectionFlow({
          refs,
          setters,
          walletType: HardwareWalletType.Ledger,
          deviceId: null,
          handleError: jest.fn(),
          updateConnectionState,
          createAdapterWithCallbacks: jest.fn(),
          initializeAdapter: jest.fn(),
          checkTransportEnabledOrShowError: jest.fn(),
        }),
      );

      act(() => {
        result.current.handleConnectionSuccess();
      });

      expect(setters.setTargetWalletType).not.toHaveBeenCalled();
      expect(updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });
  });
});
