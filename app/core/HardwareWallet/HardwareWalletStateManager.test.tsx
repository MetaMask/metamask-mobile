import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useHardwareWalletStateManager } from './HardwareWalletStateManager';
import { HardwareWalletType, getHardwareWalletTypeForAddress } from './helpers';
import { ConnectionStatus } from './connectionState';
import { BluetoothPermissionState, LocationPermissionState } from './types';

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
    it('should return disconnected connection state', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('should return null deviceId', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.deviceId).toBeNull();
    });

    it('should return default permission state', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.permissionState).toEqual({
        bluetooth: BluetoothPermissionState.Unknown,
        location: LocationPermissionState.Unknown,
      });
    });

    it('should return null walletType for non-hardware accounts', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
    });
  });

  describe('wallet type detection', () => {
    it('should detect Ledger wallet type from selected account', () => {
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

    it('should detect QR wallet type from selected account', () => {
      const mockAccount = {
        address: '0xqrwalletaddress',
      };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.QR);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBe(HardwareWalletType.QR);
    });

    it('should return null for non-hardware accounts', () => {
      const mockAccount = {
        address: '0xsoftwarewalletaddress',
      };
      mockUseSelector.mockReturnValue(mockAccount);
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
    });

    it('should handle no selected account', () => {
      mockUseSelector.mockReturnValue(null);

      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.state.walletType).toBeNull();
      expect(mockGetHardwareWalletType).not.toHaveBeenCalled();
    });
  });

  describe('setters', () => {
    describe('setConnectionState', () => {
      it('should update connection state', () => {
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

      it('should accept function updater', () => {
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
      it('should update device ID', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setDeviceId('my-device-id');
        });

        expect(result.current.state.deviceId).toBe('my-device-id');
      });

      it('should allow clearing device ID', () => {
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

    describe('setPermissionState', () => {
      it('should update permission state', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setPermissionState({
            bluetooth: BluetoothPermissionState.Granted,
            location: LocationPermissionState.Granted,
          });
        });

        expect(result.current.state.permissionState).toEqual({
          bluetooth: BluetoothPermissionState.Granted,
          location: LocationPermissionState.Granted,
        });
      });

      it('should accept function updater', () => {
        const { result } = renderHook(() => useHardwareWalletStateManager());

        act(() => {
          result.current.setters.setPermissionState((prev) => ({
            ...prev,
            bluetooth: BluetoothPermissionState.Granted,
          }));
        });

        expect(result.current.state.permissionState.bluetooth).toBe(
          BluetoothPermissionState.Granted,
        );
      });
    });
  });

  describe('refs', () => {
    it('should provide adapter ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.adapterRef).toBeDefined();
      expect(result.current.refs.adapterRef.current).toBeNull();
    });

    it('should provide isConnecting ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.isConnectingRef).toBeDefined();
      expect(result.current.refs.isConnectingRef.current).toBe(false);
    });

    it('should provide abortController ref', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      expect(result.current.refs.abortControllerRef).toBeDefined();
      expect(result.current.refs.abortControllerRef.current).toBeNull();
    });

    it('should allow mutating refs', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.refs.isConnectingRef.current = true;
      });

      expect(result.current.refs.isConnectingRef.current).toBe(true);
    });
  });

  describe('resetState', () => {
    it('should reset connection state to disconnected', () => {
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

    it('should reset device ID', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.setters.setDeviceId('device-123');
      });
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.deviceId).toBeNull();
    });

    it('should reset refs', () => {
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

    it('should reset permission state', () => {
      const { result } = renderHook(() => useHardwareWalletStateManager());

      act(() => {
        result.current.setters.setPermissionState({
          bluetooth: BluetoothPermissionState.Granted,
          location: LocationPermissionState.Granted,
        });
      });
      act(() => {
        result.current.resetState();
      });

      // Permission state should be reset to defaults
      expect(result.current.state.permissionState.bluetooth).toBe(
        BluetoothPermissionState.Unknown,
      );
    });
  });

  describe('memoization', () => {
    it('should memoize state object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const state1 = result.current.state;
      rerender();
      const state2 = result.current.state;

      // State object should be the same reference if nothing changed
      expect(state1).toBe(state2);
    });

    it('should memoize refs object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const refs1 = result.current.refs;
      rerender();
      const refs2 = result.current.refs;

      expect(refs1).toBe(refs2);
    });

    it('should memoize setters object', () => {
      const { result, rerender } = renderHook(() =>
        useHardwareWalletStateManager(),
      );

      const setters1 = result.current.setters;
      rerender();
      const setters2 = result.current.setters;

      expect(setters1).toBe(setters2);
    });

    it('should return new state object when state changes', () => {
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
