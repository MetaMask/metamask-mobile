import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTwapOrders } from './usePerpsTwapOrders';

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getTwapOrders: jest.fn(),
    },
  },
}));

const buildTwapOrder = (overrides: Partial<TwapOrder> = {}): TwapOrder => ({
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
  ...overrides,
});

const mockController: {
  getTwapOrders: jest.Mock;
  subscribeToTwapOrders?: jest.Mock;
} = jest.mocked(Engine.context.PerpsController);

describe('usePerpsTwapOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockController.subscribeToTwapOrders = undefined;
    mockController.getTwapOrders.mockResolvedValue([buildTwapOrder()]);
  });

  it('reads schedules from the controller on mount', async () => {
    // Arrange / Act
    const { result } = renderHook(() => usePerpsTwapOrders());

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.twapOrders).toStrictEqual([buildTwapOrder()]);
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);
  });

  it('skips the initial read when asked', async () => {
    // Arrange / Act
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ skipInitialFetch: true }),
    );

    // Assert
    expect(mockController.getTwapOrders).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces a read failure without throwing', async () => {
    // Arrange
    mockController.getTwapOrders.mockRejectedValue(new Error('venue down'));

    // Act
    const { result } = renderHook(() => usePerpsTwapOrders());

    // Assert
    await waitFor(() => expect(result.current.error).toBe('venue down'));
    expect(result.current.twapOrders).toStrictEqual([]);
  });

  it('refetches on refresh', async () => {
    // Arrange
    const { result } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(2);
  });

  it('prefers the controller subscription when the provider offers one', async () => {
    // Arrange: a controller that pushes one schedule and never needs polling
    const streamed = buildTwapOrder({ orderId: 'streamed' });
    const unsubscribe = jest.fn();
    mockController.subscribeToTwapOrders = jest.fn(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        params.callback([streamed]);
        return unsubscribe;
      },
    );

    // Act: skip the mount read so only the stream can write the list
    const { result, unmount } = renderHook(() =>
      usePerpsTwapOrders({ enablePolling: true, skipInitialFetch: true }),
    );

    // Assert
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([streamed]),
    );
    expect(mockController.getTwapOrders).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('keeps fills a prior read resolved when the stream omits them', async () => {
    // Arrange: the stream carries schedule state without slice fills
    const fill = {
      fillId: 'f1',
      orderId: 'twap-1',
      side: 'buy' as const,
      price: '100',
      size: '1',
      fee: '0.1',
      feeToken: 'USDC',
      timestamp: 1_000,
      transactionHash: '0xabc',
    };
    mockController.getTwapOrders.mockResolvedValue([
      buildTwapOrder({ fills: [fill] }),
    ]);
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders = jest.fn(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        pushStreamed = params.callback;
        return jest.fn();
      },
    );

    // Act: let the read land first, so the stream genuinely merges onto it
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enablePolling: true }),
    );
    await waitFor(() =>
      expect(result.current.twapOrders[0]?.fills).toStrictEqual([fill]),
    );
    await act(async () => {
      pushStreamed?.([buildTwapOrder({ fills: [] })]);
    });

    // Assert: the stream's empty fills must not erase the known ones
    expect(result.current.twapOrders[0]?.fills).toStrictEqual([fill]);
  });

  describe('polling fallback', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('falls back to polling when the provider has no push channel', async () => {
      // Act
      renderHook(() =>
        usePerpsTwapOrders({ enablePolling: true, pollingInterval: 1000 }),
      );
      await act(async () => {
        jest.advanceTimersByTime(2500);
      });

      // Assert: the initial read plus two poll ticks
      expect(mockController.getTwapOrders.mock.calls.length).toBeGreaterThan(1);
    });
  });
});
