import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTerminateTwap } from './usePerpsTerminateTwap';

let mockSelectedAddress = '0xabc';
let mockProvider = 'hyperliquid';
let mockNetwork = 'testnet';

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../selectors/selectedAccountAddress', () => ({
  selectPerpsSelectedAccountAddress: () => mockSelectedAddress,
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsProvider: () => mockProvider,
  selectPerpsNetwork: () => mockNetwork,
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const mockShowToast = jest.fn();
const mockCancellationSuccess = jest.fn(() => ({ id: 'success' }));
jest.mock('./usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        shared: {
          cancellationSuccess: mockCancellationSuccess,
          cancellationFailed: { id: 'failed' },
        },
      },
    },
  }),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      cancelOrder: jest.fn(),
    },
  },
}));

const twapOrder: TwapOrder = {
  orderId: 'twap-1',
  symbol: 'BTC',
  side: 'buy',
  size: '10',
  executedSize: '4',
  remainingSize: '6',
  executedNotional: '400',
  fillProgressBps: 4000,
  timeProgressBps: 5000,
  elapsedTimeMilliseconds: 60_000,
  durationMinutes: 30,
  randomize: false,
  reduceOnly: false,
  status: 'active',
  startedAt: 1_000,
  lastUpdated: 2_000,
  fills: [],
  providerId: 'hyperliquid',
};

const mockCancelOrder = Engine.context.PerpsController.cancelOrder as jest.Mock;

describe('usePerpsTerminateTwap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAddress = '0xabc';
    mockProvider = 'hyperliquid';
    mockNetwork = 'testnet';
    mockCancelOrder.mockResolvedValue({ success: true });
  });

  it('cancels through the venue TWAP path', async () => {
    // Arrange
    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onSuccess }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: orderType discriminates the strategy cancel path
    expect(mockCancelOrder).toHaveBeenCalledWith({
      orderId: 'twap-1',
      symbol: 'BTC',
      orderType: 'twap',
      providerId: 'hyperliquid',
    });
    expect(onSuccess).toHaveBeenCalledWith(twapOrder);
    expect(result.current.isTerminationInFlight).toBe(false);
  });

  it('routes cancellation to the provider that owns the schedule', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());
    const routedOrder = { ...twapOrder, providerId: 'myx' as const };

    // Act
    await act(async () => {
      await result.current.terminateTwap(routedOrder);
    });

    // Assert
    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'myx' }),
    );
  });

  it('keeps the first cancellation when a colliding provider target confirms while it is pending', async () => {
    // Arrange
    let resolveCancellation:
      | ((result: { success: boolean }) => void)
      | undefined;
    const pendingCancellation = new Promise<{ success: boolean }>((resolve) => {
      resolveCancellation = resolve;
    });
    mockCancelOrder.mockReturnValue(pendingCancellation);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onSuccess }));
    const collidingProviderOrder = {
      ...twapOrder,
      providerId: 'myx' as const,
    };
    let firstTermination: Promise<void> | undefined;
    let secondTermination: Promise<void> | undefined;

    // Act: both venue targets share the same local order ID, but cancellation
    // is globally one-at-a-time and the ref lock is set synchronously.
    act(() => {
      firstTermination = result.current.terminateTwap(twapOrder);
      secondTermination = result.current.terminateTwap(collidingProviderOrder);
    });

    // Assert
    expect(mockCancelOrder).toHaveBeenCalledTimes(1);
    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'hyperliquid' }),
    );
    expect(result.current.isTerminationInFlight).toBe(true);

    // Act
    await act(async () => {
      resolveCancellation?.({ success: true });
      await Promise.all([firstTermination, secondTermination]);
    });

    // Assert: the ignored second confirm cannot replace the first outcome.
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(twapOrder);
    expect(result.current.isTerminationInFlight).toBe(false);
  });

  it('names the filled size in the success toast', async () => {
    // Arrange: a partially filled opening schedule
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: passing direction/amount/symbol keeps the shared copy off
    // "funds are available to trade", which would contradict the sheet's
    // warning that filled size stays as a position
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      false,
      undefined,
      'long',
      '4',
      'BTC',
    );
  });

  it('omits fill details when nothing executed', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap({ ...twapOrder, executedSize: '0' });
    });

    // Assert
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      false,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('omits directional fill copy for a reduce-only schedule', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());

    // Act
    await act(async () => {
      await result.current.terminateTwap({ ...twapOrder, reduceOnly: true });
    });

    // Assert
    expect(mockCancellationSuccess).toHaveBeenCalledWith(
      true,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('treats an unsuccessful result as a failure', async () => {
    // Arrange
    mockCancelOrder.mockResolvedValue({ success: false, error: 'rejected' });
    const onError = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onError }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert
    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0].message).toBe('rejected');
  });

  it('does not throw when the controller rejects', async () => {
    // Arrange
    mockCancelOrder.mockRejectedValue(new Error('network down'));
    const onError = jest.fn();
    const { result } = renderHook(() => usePerpsTerminateTwap({ onError }));

    // Act
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });

    // Assert: the failure surfaces through the callback, not a rejection
    expect(onError.mock.calls[0][0].message).toBe('network down');
    expect(result.current.isTerminationInFlight).toBe(false);
  });

  it.each([
    ['account', () => (mockSelectedAddress = '0xdef')],
    ['provider', () => (mockProvider = 'myx')],
    ['network', () => (mockNetwork = 'mainnet')],
  ])(
    'suppresses pending cancellation completion after a %s switch',
    async (_identity, switchIdentity) => {
      // Arrange
      let resolveCancellation:
        | ((result: { success: boolean }) => void)
        | undefined;
      const pendingCancellation = new Promise<{ success: boolean }>(
        (resolve) => {
          resolveCancellation = resolve;
        },
      );
      mockCancelOrder.mockReturnValue(pendingCancellation);
      const onSuccess = jest.fn();
      const onError = jest.fn();
      const { result, rerender } = renderHook(() =>
        usePerpsTerminateTwap({ onSuccess, onError }),
      );
      let terminatePromise: Promise<void> | undefined;
      act(() => {
        terminatePromise = result.current.terminateTwap(twapOrder);
      });
      expect(result.current.isTerminationInFlight).toBe(true);

      // Act
      switchIdentity();
      rerender();
      await waitFor(() =>
        expect(result.current.isTerminationInFlight).toBe(false),
      );
      await act(async () => {
        resolveCancellation?.({ success: true });
        await terminatePromise;
      });

      // Assert
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(result.current.isTerminationInFlight).toBe(false);
    },
  );

  it('suppresses a pending cancellation rejection after an identity switch', async () => {
    // Arrange
    let rejectCancellation: ((error: Error) => void) | undefined;
    const pendingCancellation = new Promise<{ success: boolean }>(
      (_resolve, reject) => {
        rejectCancellation = reject;
      },
    );
    mockCancelOrder.mockReturnValue(pendingCancellation);
    const onSuccess = jest.fn();
    const onError = jest.fn();
    const { result, rerender } = renderHook(() =>
      usePerpsTerminateTwap({ onSuccess, onError }),
    );
    let terminatePromise: Promise<void> | undefined;
    act(() => {
      terminatePromise = result.current.terminateTwap(twapOrder);
    });

    // Act
    mockNetwork = 'mainnet';
    rerender();
    await act(async () => {
      rejectCancellation?.(new Error('stale failure'));
      await terminatePromise;
    });

    // Assert
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(result.current.isTerminationInFlight).toBe(false);
  });
});
