import { renderHook, act } from '@testing-library/react-native';
import type { MutableRefObject } from 'react';
import { useSelector } from 'react-redux';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { useAdapterLifecycle } from './useAdapterLifecycle';
import { createAdapter } from '../adapters';
import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

jest.mock('../adapters', () => ({
  createAdapter: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockCreateAdapter = createAdapter as jest.MockedFunction<
  typeof createAdapter
>;

const createMockAdapter = (): HardwareWalletAdapter =>
  ({
    walletType: HardwareWalletType.Ledger,
    onTransportStateChange: jest.fn(() => jest.fn()),
    destroy: jest.fn(),
  }) as unknown as HardwareWalletAdapter;

interface LifecycleOptionsOverrides {
  handleError?: jest.Mock;
  updateConnectionState?: jest.Mock;
  isFlowActive?: () => boolean;
}

const createOptions = (
  overrides: LifecycleOptionsOverrides = {},
): Parameters<typeof useAdapterLifecycle>[0] => ({
  walletType: HardwareWalletType.Ledger as HardwareWalletType | null,
  adapterRef: {
    current: null,
  } as MutableRefObject<HardwareWalletAdapter | null>,
  handleDeviceEvent: jest.fn(),
  handleError: jest.fn(),
  updateConnectionState: jest.fn(),
  ...overrides,
});

/** Returns the callbacks the hook registered for the Ledger adapter. */
const getAdapterCallbacks = (): HardwareWalletAdapterOptions => {
  const call = mockCreateAdapter.mock.calls.find(
    ([targetType]) => targetType === HardwareWalletType.Ledger,
  );
  if (!call) {
    throw new Error('Expected createAdapter to be called with Ledger');
  }
  return call[1];
};

describe('useAdapterLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue({});
    mockCreateAdapter.mockImplementation(() => createMockAdapter());
  });

  describe('onDisconnect error routing', () => {
    it('routes the error through handleError while the flow is active', () => {
      const handleError = jest.fn();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useAdapterLifecycle(
          createOptions({
            handleError,
            updateConnectionState,
            isFlowActive: () => true,
          }),
        ),
      );

      act(() => {
        getAdapterCallbacks().onDisconnect(new Error('device dropped'));
      });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
      expect(updateConnectionState).not.toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });

    it('does not route the error through handleError when the flow is inactive and sets Disconnected', () => {
      const handleError = jest.fn();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useAdapterLifecycle(
          createOptions({
            handleError,
            updateConnectionState,
            isFlowActive: () => false,
          }),
        ),
      );

      act(() => {
        getAdapterCallbacks().onDisconnect(new Error('device dropped'));
      });

      expect(handleError).not.toHaveBeenCalled();
      expect(updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });

    it('routes the error through handleError when isFlowActive is not provided (back-compat)', () => {
      const handleError = jest.fn();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useAdapterLifecycle(
          createOptions({ handleError, updateConnectionState }),
        ),
      );

      act(() => {
        getAdapterCallbacks().onDisconnect(new Error('device dropped'));
      });

      expect(handleError).toHaveBeenCalledWith(expect.any(Error));
      expect(updateConnectionState).not.toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });

    it('sets Disconnected without handleError when no error is provided', () => {
      const handleError = jest.fn();
      const updateConnectionState = jest.fn();

      const { result } = renderHook(() =>
        useAdapterLifecycle(
          createOptions({
            handleError,
            updateConnectionState,
            isFlowActive: () => false,
          }),
        ),
      );

      act(() => {
        getAdapterCallbacks().onDisconnect();
      });

      expect(handleError).not.toHaveBeenCalled();
      expect(updateConnectionState).toHaveBeenCalledWith({
        status: ConnectionStatus.Disconnected,
      });
    });
  });

  describe('adapter creation', () => {
    it('creates an adapter for the current wallet type on mount', () => {
      renderHook(() => useAdapterLifecycle(createOptions()));

      expect(mockCreateAdapter).toHaveBeenCalledWith(
        HardwareWalletType.Ledger,
        expect.objectContaining({
          onDisconnect: expect.any(Function),
          onDeviceEvent: expect.any(Function),
        }),
        expect.any(Boolean),
      );
    });
  });
});
