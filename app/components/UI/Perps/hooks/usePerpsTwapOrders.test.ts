import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTwapOrders } from './usePerpsTwapOrders';

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

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getTwapOrders: jest.fn(),
      subscribeToTwapOrders: jest.fn(),
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

const mockController = jest.mocked(Engine.context.PerpsController);

describe('usePerpsTwapOrders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedAddress = '0xabc';
    mockProvider = 'hyperliquid';
    mockNetwork = 'testnet';
    mockController.getTwapOrders.mockResolvedValue([buildTwapOrder()]);
    mockController.subscribeToTwapOrders.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    // A failed polling assertion cannot leak fake timers into waitFor tests.
    jest.useRealTimers();
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

  it('keeps a read error visible until a refresh succeeds', async () => {
    // Arrange
    let resolveRefresh: ((orders: TwapOrder[]) => void) | undefined;
    const refreshRead = new Promise<TwapOrder[]>((resolve) => {
      resolveRefresh = resolve;
    });
    mockController.getTwapOrders
      .mockRejectedValueOnce(new Error('venue down'))
      .mockReturnValueOnce(refreshRead);
    const { result } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() => expect(result.current.error).toBe('venue down'));

    // Act
    let refreshPromise: Promise<void> | undefined;
    act(() => {
      refreshPromise = result.current.refresh();
    });

    // Assert
    expect(result.current.error).toBe('venue down');
    expect(result.current.isRefreshing).toBe(true);

    // Act
    resolveRefresh?.([buildTwapOrder()]);
    await act(async () => {
      await refreshPromise;
    });

    // Assert
    expect(result.current.error).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
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

  it('discards a read that resolves after a newer refresh', async () => {
    // Arrange
    let resolveFirstRead: ((orders: TwapOrder[]) => void) | undefined;
    const firstRead = new Promise<TwapOrder[]>((resolve) => {
      resolveFirstRead = resolve;
    });
    const newerOrder = buildTwapOrder({ orderId: 'newer' });
    mockController.getTwapOrders
      .mockReturnValueOnce(firstRead)
      .mockResolvedValueOnce([newerOrder]);
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ skipInitialFetch: true }),
    );
    let firstRefresh: Promise<void> | undefined;

    // Act
    act(() => {
      firstRefresh = result.current.refresh();
    });
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      resolveFirstRead?.([buildTwapOrder({ orderId: 'older' })]);
      await firstRefresh;
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([newerOrder]);
  });

  it('commits a controller stream ahead of an older REST read', async () => {
    // Arrange
    const streamed = buildTwapOrder({ orderId: 'streamed' });
    const unsubscribe = jest.fn();
    mockController.subscribeToTwapOrders.mockImplementation(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        params.callback([streamed]);
        return unsubscribe;
      },
    );

    // Act
    const { result, unmount } = renderHook(() =>
      usePerpsTwapOrders({ enablePolling: true, skipInitialFetch: true }),
    );

    // Assert
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([streamed]),
    );
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);
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
    mockController.subscribeToTwapOrders.mockImplementation(
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

  it('keeps bounded REST refreshes running after a stream update', async () => {
    // Arrange
    jest.useFakeTimers();
    mockController.subscribeToTwapOrders.mockImplementation(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        params.callback([buildTwapOrder({ orderId: 'streamed' })]);
        return jest.fn();
      },
    );

    // Act
    const { unmount } = renderHook(() =>
      usePerpsTwapOrders({
        enablePolling: true,
        pollingInterval: 1000,
        skipInitialFetch: true,
      }),
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2500);
    });

    // Assert: the immediate read plus interval refreshes continue after push.
    expect(mockController.getTwapOrders.mock.calls.length).toBeGreaterThan(1);
    unmount();
  });

  it('clears schedules immediately when the selected account changes', async () => {
    // Arrange
    let resolveNextAccount: ((orders: TwapOrder[]) => void) | undefined;
    const nextAccountRead = new Promise<TwapOrder[]>((resolve) => {
      resolveNextAccount = resolve;
    });
    mockController.getTwapOrders
      .mockResolvedValueOnce([buildTwapOrder({ orderId: 'first-account' })])
      .mockReturnValueOnce(nextAccountRead);
    const { result, rerender } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() =>
      expect(result.current.twapOrders[0]?.orderId).toBe('first-account'),
    );

    // Act
    mockSelectedAddress = '0xdef';
    rerender();

    // Assert
    expect(result.current.twapOrders).toStrictEqual([]);
    expect(result.current.isLoading).toBe(true);

    // Cleanup the pending state update before unmount.
    await act(async () => {
      resolveNextAccount?.([]);
      await nextAccountRead;
    });
  });

  it.each([
    ['account', () => (mockSelectedAddress = '0xdef')],
    ['provider', () => (mockProvider = 'aggregated')],
    ['network', () => (mockNetwork = 'mainnet')],
  ])('restarts the subscription when %s changes', (_context, changeContext) => {
    // Arrange
    const firstUnsubscribe = jest.fn();
    const secondUnsubscribe = jest.fn();
    mockController.subscribeToTwapOrders
      .mockReturnValueOnce(firstUnsubscribe)
      .mockReturnValueOnce(secondUnsubscribe);
    const { rerender, unmount } = renderHook(() =>
      usePerpsTwapOrders({ enablePolling: true, skipInitialFetch: true }),
    );

    // Act
    changeContext();
    rerender();

    // Assert
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(2);
    unmount();
    expect(secondUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
