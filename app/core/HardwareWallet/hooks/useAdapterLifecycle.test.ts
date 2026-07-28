import { act, renderHook } from '@testing-library/react-native';
import {
  HardwareWalletConnectionState,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { createAdapter } from '../adapters';
import { HardwareWalletAdapter } from '../types';
import { useAdapterLifecycle } from './useAdapterLifecycle';

jest.mock('../adapters', () => ({
  createAdapter: jest.fn(),
}));

jest.mock('../../SDKConnect/utils/DevLogger', () => ({
  log: jest.fn(),
}));

const mockCreateAdapter = jest.mocked(createAdapter);

const createMockAdapter = (
  walletType: HardwareWalletType | null,
): HardwareWalletAdapter =>
  ({
    walletType,
    disconnect: jest.fn().mockResolvedValue(undefined),
    onTransportStateChange: jest.fn(() => jest.fn()),
  }) as unknown as HardwareWalletAdapter;

describe('useAdapterLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets the transport baseline when an adapter is initialized imperatively', () => {
    const initialAdapter = createMockAdapter(HardwareWalletType.Qr);
    const nextAdapter = createMockAdapter(HardwareWalletType.Ledger);
    const adapterRef = { current: null as HardwareWalletAdapter | null };
    mockCreateAdapter.mockReturnValue(initialAdapter);
    const { result, unmount } = renderHook(() =>
      useAdapterLifecycle({
        walletType: HardwareWalletType.Qr,
        adapterRef,
        handleDeviceEvent: jest.fn(),
        handleError: jest.fn(),
        updateConnectionState: jest.fn(
          (_state: HardwareWalletConnectionState) => undefined,
        ),
      }),
    );
    result.current.previousTransportAvailableRef.current = true;

    act(() => {
      result.current.initializeAdapter(nextAdapter);
    });

    expect(result.current.previousTransportAvailableRef.current).toBeNull();
    unmount();
  });

  it('routes kept adapter callbacks to the latest error handler', () => {
    const adapter = createMockAdapter(HardwareWalletType.Qr);
    const initialHandleError = jest.fn();
    const latestHandleError = jest.fn();
    const adapterRef = { current: null as HardwareWalletAdapter | null };
    mockCreateAdapter.mockReturnValue(adapter);
    const { result, rerender, unmount } = renderHook(
      ({ handleError }: { handleError: (error: unknown) => void }) =>
        useAdapterLifecycle({
          walletType: HardwareWalletType.Qr,
          adapterRef,
          handleDeviceEvent: jest.fn(),
          handleError,
          updateConnectionState: jest.fn(
            (_state: HardwareWalletConnectionState) => undefined,
          ),
        }),
      { initialProps: { handleError: initialHandleError } },
    );
    act(() => {
      result.current.createAdapterWithCallbacks(HardwareWalletType.Ledger);
    });
    const onDisconnect =
      mockCreateAdapter.mock.calls[mockCreateAdapter.mock.calls.length - 1][1]
        .onDisconnect;

    rerender({ handleError: latestHandleError });
    act(() => {
      onDisconnect(new Error('Disconnected'));
    });

    expect(latestHandleError).toHaveBeenCalledWith(new Error('Disconnected'));
    expect(initialHandleError).not.toHaveBeenCalled();
    unmount();
  });

  it('replaces the adapter when the rendered wallet type changes', () => {
    const qrAdapter = createMockAdapter(HardwareWalletType.Qr);
    const ledgerAdapter = createMockAdapter(HardwareWalletType.Ledger);
    const adapterRef = { current: null as HardwareWalletAdapter | null };
    mockCreateAdapter.mockImplementation((walletType) =>
      walletType === HardwareWalletType.Ledger ? ledgerAdapter : qrAdapter,
    );
    const { rerender, unmount } = renderHook(
      ({ walletType }: { walletType: HardwareWalletType }) =>
        useAdapterLifecycle({
          walletType,
          adapterRef,
          handleDeviceEvent: jest.fn(),
          handleError: jest.fn(),
          updateConnectionState: jest.fn(
            (_state: HardwareWalletConnectionState) => undefined,
          ),
        }),
      { initialProps: { walletType: HardwareWalletType.Qr } },
    );

    rerender({ walletType: HardwareWalletType.Ledger });

    expect(qrAdapter.disconnect).toHaveBeenCalledTimes(1);
    expect(adapterRef.current).toBe(ledgerAdapter);
    unmount();
  });

  it('disconnects the current adapter on unmount', () => {
    const adapter = createMockAdapter(HardwareWalletType.Qr);
    const adapterRef = { current: null as HardwareWalletAdapter | null };
    mockCreateAdapter.mockReturnValue(adapter);
    const { unmount } = renderHook(() =>
      useAdapterLifecycle({
        walletType: HardwareWalletType.Qr,
        adapterRef,
        handleDeviceEvent: jest.fn(),
        handleError: jest.fn(),
        updateConnectionState: jest.fn(
          (_state: HardwareWalletConnectionState) => undefined,
        ),
      }),
    );

    unmount();

    expect(adapter.disconnect).toHaveBeenCalledTimes(1);
  });
});
