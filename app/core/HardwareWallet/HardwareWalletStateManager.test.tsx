import { act } from '@testing-library/react-hooks';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { useHardwareWalletStateManager } from './HardwareWalletStateManager';
import { getHardwareWalletTypeForAddress } from './helpers';
import {
  renderHookWithProvider,
  DeepPartial,
} from '../../util/test/renderWithProvider';
import { RootState } from '../../reducers';
import { createMockAccountsControllerState } from '../../util/test/accountsControllerTestUtils';

jest.mock('./helpers', () => ({
  ...jest.requireActual('./helpers'),
  getHardwareWalletTypeForAddress: jest.fn(),
}));

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const MOCK_ADDRESS_QR = '0xabcdef1234567890abcdef1234567890abcdef12';
const MOCK_ADDRESS_SW = '0x0000000000000000000000000000000000000001';

const createStateWithAccount = (address: string): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      AccountsController: createMockAccountsControllerState([address]),
    },
  },
});

const EMPTY_ACCOUNTS_STATE: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {},
          selectedAccount: '',
        },
      },
    },
  },
};

describe('useHardwareWalletStateManager', () => {
  const mockGetHardwareWalletType =
    getHardwareWalletTypeForAddress as jest.MockedFunction<
      typeof getHardwareWalletTypeForAddress
    >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHardwareWalletType.mockReturnValue(undefined);
  });

  describe('initial state', () => {
    it('returns disconnected connection state', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('returns null deviceId', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.state.deviceId).toBeNull();
    });

    it('returns null walletType for non-hardware accounts', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.state.walletType).toBeNull();
    });
  });

  describe('wallet type detection', () => {
    it('detects Ledger wallet type from selected account', () => {
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Ledger);

      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: createStateWithAccount(MOCK_ADDRESS) },
      );

      expect(result.current.state.walletType).toBe(HardwareWalletType.Ledger);
      expect(mockGetHardwareWalletType).toHaveBeenCalledWith(MOCK_ADDRESS);
    });

    it('detects QR wallet type from selected account', () => {
      mockGetHardwareWalletType.mockReturnValue(HardwareWalletType.Qr);

      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: createStateWithAccount(MOCK_ADDRESS_QR) },
      );

      expect(result.current.state.walletType).toBe(HardwareWalletType.Qr);
    });

    it('returns null for non-hardware accounts', () => {
      mockGetHardwareWalletType.mockReturnValue(undefined);

      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: createStateWithAccount(MOCK_ADDRESS_SW) },
      );

      expect(result.current.state.walletType).toBeNull();
    });

    it('handles no selected account', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.state.walletType).toBeNull();
      expect(mockGetHardwareWalletType).not.toHaveBeenCalled();
    });
  });

  describe('setters', () => {
    describe('setConnectionState', () => {
      it('updates connection state', () => {
        const { result } = renderHookWithProvider(
          () => useHardwareWalletStateManager(),
          { state: EMPTY_ACCOUNTS_STATE },
        );

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
        const { result } = renderHookWithProvider(
          () => useHardwareWalletStateManager(),
          { state: EMPTY_ACCOUNTS_STATE },
        );

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
        const { result } = renderHookWithProvider(
          () => useHardwareWalletStateManager(),
          { state: EMPTY_ACCOUNTS_STATE },
        );

        act(() => {
          result.current.setters.setDeviceId('my-device-id');
        });

        expect(result.current.state.deviceId).toBe('my-device-id');
      });

      it('allows clearing device ID', () => {
        const { result } = renderHookWithProvider(
          () => useHardwareWalletStateManager(),
          { state: EMPTY_ACCOUNTS_STATE },
        );

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
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.refs.adapterRef).toBeDefined();
      expect(result.current.refs.adapterRef.current).toBeNull();
    });

    it('provides isConnecting ref', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.refs.isConnectingRef).toBeDefined();
      expect(result.current.refs.isConnectingRef.current).toBe(false);
    });

    it('provides abortController ref', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      expect(result.current.refs.abortControllerRef).toBeDefined();
      expect(result.current.refs.abortControllerRef.current).toBeNull();
    });

    it('allows mutating refs', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      act(() => {
        result.current.refs.isConnectingRef.current = true;
      });

      expect(result.current.refs.isConnectingRef.current).toBe(true);
    });
  });

  describe('resetState', () => {
    it('resets connection state to disconnected', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      act(() => {
        result.current.setters.setConnectionState({
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        });
        result.current.setters.setDeviceId('device-123');
      });

      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.connectionState.status).toBe(
        ConnectionStatus.Disconnected,
      );
    });

    it('resets device ID', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      act(() => {
        result.current.setters.setDeviceId('device-123');
      });
      act(() => {
        result.current.resetState();
      });

      expect(result.current.state.deviceId).toBeNull();
    });

    it('resets refs', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      act(() => {
        result.current.refs.isConnectingRef.current = true;
        result.current.refs.adapterRef.current = {} as never;
        result.current.refs.abortControllerRef.current = new AbortController();
      });
      act(() => {
        result.current.resetState();
      });

      expect(result.current.refs.isConnectingRef.current).toBe(false);
      expect(result.current.refs.adapterRef.current).toBeNull();
      expect(result.current.refs.abortControllerRef.current).toBeNull();
    });
  });

  describe('memoization', () => {
    it('memoizes state object', () => {
      const { result, rerender } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      const state1 = result.current.state;
      rerender({});
      const state2 = result.current.state;

      expect(state1).toBe(state2);
    });

    it('memoizes refs object', () => {
      const { result, rerender } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      const refs1 = result.current.refs;
      rerender({});
      const refs2 = result.current.refs;

      expect(refs1).toBe(refs2);
    });

    it('memoizes setters object', () => {
      const { result, rerender } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

      const setters1 = result.current.setters;
      rerender({});
      const setters2 = result.current.setters;

      expect(setters1).toBe(setters2);
    });

    it('returns new state object when state changes', () => {
      const { result } = renderHookWithProvider(
        () => useHardwareWalletStateManager(),
        { state: EMPTY_ACCOUNTS_STATE },
      );

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
