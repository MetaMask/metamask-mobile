import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useHardwareWalletStateManager } from './HardwareWalletStateManager';
import { getHardwareWalletTypeForAddress } from './helpers';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

// Mock helpers
jest.mock('./helpers', () => ({
  ...jest.requireActual('./helpers'),
  getHardwareWalletTypeForAddress: jest.fn(),
}));

describe('useHardwareWalletStateManager', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockGetHardwareWalletType =
    getHardwareWalletTypeForAddress as jest.MockedFunction<
      typeof getHardwareWalletTypeForAddress
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: non-hardware wallet account
    mockUseSelector.mockReturnValue(null);
    mockGetHardwareWalletType.mockReturnValue(undefined);
  });

  describe('initial state', () => {
    it('returns disconnected connection state', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('returns null deviceId', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.deviceId).toBeNull();
    });

    it('returns null walletType for non-hardware accounts', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
    });
  });

  describe('wallet type detection', () => {
    it('detects Ledger wallet type from selected account', () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
      };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBe(HardwareWalletType.Ledger);
      expect(mockGetHardwareWalletType).toHaveBeenCalledWith(
        mockAccount.address,
      );
    });

    it('detects QR wallet type from selected account', () => {
      const mockAccount = {
        address: '0xqrwalletaddress',
      };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Qr);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBe(HardwareWalletType.Qr);
    });

    it('returns null for non-hardware accounts', () => {
      const mockAccount = {
        address: '0xsoftwarewalletaddress',
      };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
    });

    it('handles no selected account', () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
      expect(mockGetHardwareWalletType).not.toHaveBeenCalled();
    });
  });

  describe('setters', () => {
    describe('setConnectionState', () => {
      it('updates connection state', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setConnectionState({
            status: ConnectionStatus.Connecting,
          });
        });

        expect(result.current.state.connectionState.status).toBe(
          ConnectionStatus.Connecting,
        );
      });

      it('accepts function updater', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setConnectionState((prev) => ({
            ...prev,
            status: ConnectionStatus.Connected,
            deviceId: 'device-123',
          }));
        });

        expect(result.current.state.connectionState).toEqual({
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        });
      });
    });

    describe('setDeviceId', () => {
      it('updates device ID', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setDeviceId('my-device-id');
        });

        expect(result.current.state.deviceId).toBe('my-device-id');
      });

      it('allows clearing device ID', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setDeviceId('device-123');
        });
        act(() => {
          result.current.setters.setDeviceId(null);
        });

        expect(result.current.state.deviceId).toBeNull();
      });
    });
  });

  describe('refs', () => {
    it('provides adapter ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.adapterRef).toBeDefined();
      expect(result.current.refs.adapterRef.current).toBeNull();
    });

    it('provides isConnecting ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.isConnectingRef).toBeDefined();
      expect(result.current.refs.isConnectingRef.current).toBe(false);
    });

    it('provides abortController ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.abortControllerRef).toBeDefined();
      expect(result.current.refs.abortControllerRef.current).toBeNull();
    });

    it('allows mutating refs', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.refs.isConnectingRef.current = true;
      });

      expect(result.current.refs.isConnectingRef.current).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets connection state to disconnected', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      // Set some state first
      act(() => {
        result.current.setters.setConnectionState({
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        });
        result.current.setters.setDeviceId('device-123');
      });

      // Reset
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('resets device ID', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.setters.setDeviceId('device-123');
      });
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.deviceId).toBeNull();
    });

    it('resets refs', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.refs.isConnectingRef.current = true;
        result.current.refs.abortControllerRef.current = new AbortController();
      });
      act(() => {
        result.current.resetState();
      });

      expect(result.current.refs.isConnectingRef.current).toBe(false);
      expect(result.current.refs.abortControllerRef.current).toBeNull();
    });
  });

  describe('memoization', () => {
    it('memoizes state object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const state1 = result.current.state;
      rerender();
      const state2 = result.current.state;

      // State object should be the same reference if nothing changed
      expect(state1).toBe(state2);
    });

    it('memoizes refs object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const refs1 = result.current.refs;
      rerender();
      const refs2 = result.current.refs;

      expect(refs1).toBe(refs2);
    });

    it('memoizes setters object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const setters1 = result.current.setters;
      rerender();
      const setters2 = result.current.setters;

      expect(setters1).toBe(setters2);
    });

    it('returns new state object when state changes', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      const state1 = result.current.state;

      act(() => {
        result.current.setters.setDeviceId('new-device');
      });

      const state2 = result.current.state;

      expect(state1).not.toBe(state2);
      expect(state2.deviceId).toBe('new-device');
    });
  });
});
