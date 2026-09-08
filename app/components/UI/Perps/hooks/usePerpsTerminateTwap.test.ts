import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { TraceName } from '../../../../util/trace';
import {
  acceptPerpsCufRequest,
  endPerpsCufRequestAfter,
  endPerpsCufTrace,
  registerPerpsCufTraceEndListener,
  startPerpsCufTrace,
  watchPerpsCufTwapTerminal,
} from '../utils/perpsCufTrace';
import { usePerpsTerminateTwap } from './usePerpsTerminateTwap';

let mockSelectedAddress = '0xabc';
let mockProvider = 'hyperliquid';
let mockNetwork = 'testnet';
let mockConnectionGeneration = 1;
const mockCufEndListeners = new Map<string, () => void>();

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

jest.mock('./usePerpsMarketContext', () => ({
  usePerpsMarketContext: () => ({
    key: `${mockNetwork}|${mockProvider}|${mockConnectionGeneration}`,
  }),
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('../utils/perpsCufTrace', () => ({
  acceptPerpsCufRequest: jest.fn(),
  endPerpsCufRequestAfter: jest.fn(),
  endPerpsCufTrace: jest.fn(),
  registerPerpsCufTraceEndListener: jest.fn(
    (opId: string, listener: () => void) => {
      mockCufEndListeners.set(opId, listener);
      return () => mockCufEndListeners.delete(opId);
    },
  ),
  startPerpsCufTrace: jest.fn(() => 'twap-cuf-op'),
  watchPerpsCufTwapTerminal: jest.fn(),
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
    mockConnectionGeneration = 1;
    mockCufEndListeners.clear();
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
    expect(startPerpsCufTrace).toHaveBeenCalledWith({
      name: TraceName.PerpsTerminateTwapToConfirmation,
      tags: { order_type: 'twap' },
    });
    expect(watchPerpsCufTwapTerminal).toHaveBeenCalledWith(
      'twap-cuf-op',
      'twap-1',
      'hyperliquid',
    );
    expect(endPerpsCufRequestAfter).toHaveBeenCalledWith(
      'twap-cuf-op',
      expect.any(Function),
      30_000,
    );
    expect(acceptPerpsCufRequest).toHaveBeenCalledWith('twap-cuf-op');
    expect(registerPerpsCufTraceEndListener).toHaveBeenCalledWith(
      'twap-cuf-op',
      expect.any(Function),
    );
    expect(onSuccess).toHaveBeenCalledWith(twapOrder);
    expect(result.current.isTerminationInFlight).toBe(false);
  });

  it('routes cancellation to the provider that owns the schedule', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());
    const routedOrder = { ...twapOrder, providerId: 'lighter' as const };

    // Act
    await act(async () => {
      await result.current.terminateTwap(routedOrder);
    });

    // Assert
    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'lighter' }),
    );
  });

  it('normalizes a legacy schedule to the default provider for routing and tracing', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTerminateTwap());
    const legacyOrder = { ...twapOrder, providerId: undefined };

    // Act
    await act(async () => {
      await result.current.terminateTwap(legacyOrder);
    });

    // Assert
    expect(mockCancelOrder).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'hyperliquid' }),
    );
    expect(watchPerpsCufTwapTerminal).toHaveBeenCalledWith(
      'twap-cuf-op',
      'twap-1',
      'hyperliquid',
    );
  });

  it('releases a successful CUF operation after central trace completion', async () => {
    // Arrange
    const { result, unmount } = renderHook(() => usePerpsTerminateTwap());
    await act(async () => {
      await result.current.terminateTwap(twapOrder);
    });
    expect(mockCufEndListeners.has('twap-cuf-op')).toBe(true);

    // Act: the central CUF terminal path invokes this for both stream and
    // timeout completion.
    act(() => mockCufEndListeners.get('twap-cuf-op')?.());
    unmount();

    // Assert: unmount cannot reclassify a completed span as disconnected.
    expect(endPerpsCufTrace).not.toHaveBeenCalledWith({
      id: 'twap-cuf-op',
      data: { success: false, reason: 'disconnected' },
    });
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
      providerId: 'lighter' as const,
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
      'TWAP',
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
      'TWAP',
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
      'TWAP',
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
    expect(endPerpsCufTrace).toHaveBeenCalledWith({
      id: 'twap-cuf-op',
      data: { success: false, reason: 'request_failed' },
    });
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
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'network down' }),
      expect.objectContaining({
        tags: expect.objectContaining({
          component: 'usePerpsTerminateTwap',
          action: 'terminate_twap',
          operation: 'order_management',
          provider: 'hyperliquid',
          network: 'testnet',
        }),
        context: expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'twap-1',
            symbol: 'BTC',
          }),
        }),
      }),
    );
  });

  it.each([
    ['account', () => (mockSelectedAddress = '0xdef')],
    ['provider', () => (mockProvider = 'lighter')],
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
      expect(endPerpsCufTrace).toHaveBeenCalledWith({
        id: 'twap-cuf-op',
        data: { success: false, reason: 'disconnected' },
      });
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

  it('suppresses a pending cancellation after a same-identity reconnect', async () => {
    // Arrange
    let resolveCancellation:
      | ((result: { success: boolean }) => void)
      | undefined;
    mockCancelOrder.mockReturnValue(
      new Promise<{ success: boolean }>((resolve) => {
        resolveCancellation = resolve;
      }),
    );
    const onSuccess = jest.fn();
    const { result, rerender } = renderHook(() =>
      usePerpsTerminateTwap({ onSuccess }),
    );
    let terminatePromise: Promise<void> | undefined;
    act(() => {
      terminatePromise = result.current.terminateTwap(twapOrder);
    });

    // Act: provider/account/network are unchanged; only connection generation
    // advances as PerpsConnectionManager reconnects.
    mockConnectionGeneration += 1;
    rerender();
    await waitFor(() =>
      expect(result.current.isTerminationInFlight).toBe(false),
    );
    await act(async () => {
      resolveCancellation?.({ success: true });
      await terminatePromise;
    });

    // Assert
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(endPerpsCufTrace).toHaveBeenCalledWith({
      id: 'twap-cuf-op',
      data: { success: false, reason: 'disconnected' },
    });
  });

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
