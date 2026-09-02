import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
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

const buildTwapFill = (
  overrides: Partial<TwapOrderFill> = {},
): TwapOrderFill => ({
  fillId: 'fill-1',
  orderId: 'twap-1',
  side: 'buy',
  price: '100',
  size: '1',
  fee: '0.1',
  feeToken: 'USDC',
  timestamp: 1_000,
  transactionHash: '0xabc',
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

  it('reads schedules from the controller on mount', async () => {
    // Arrange / Act
    const { result } = renderHook(() => usePerpsTwapOrders());

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.twapOrders).toStrictEqual([buildTwapOrder()]);
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);
  });

  it('sorts provider-grouped REST results globally by start time', async () => {
    // Arrange
    const oldest = buildTwapOrder({
      orderId: 'hyperliquid-oldest',
      providerId: 'hyperliquid',
      startedAt: 1_000,
    });
    const newest = buildTwapOrder({
      orderId: 'myx-newest',
      providerId: 'myx',
      startedAt: 3_000,
    });
    const middle = buildTwapOrder({
      orderId: 'hyperliquid-middle',
      providerId: 'hyperliquid',
      startedAt: 2_000,
    });
    mockController.getTwapOrders.mockResolvedValue([oldest, middle, newest]);

    // Act
    const { result } = renderHook(() => usePerpsTwapOrders());

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.twapOrders).toStrictEqual([newest, middle, oldest]);
  });

  it('does not manufacture an error for an indistinguishable cold-start empty aggregate', async () => {
    // Arrange: the controller contract flattens both a legitimate empty result
    // and a partial failure with no successful TWAP provider to the same [].
    mockProvider = 'aggregated';
    mockController.getTwapOrders.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => usePerpsTwapOrders());

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.twapOrders).toStrictEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('retains and deduplicates a complete known provider partition until authoritative recovery', async () => {
    // Arrange
    mockProvider = 'aggregated';
    const hyperliquidActive = buildTwapOrder({
      orderId: 'shared-order-id',
      providerId: 'hyperliquid',
      startedAt: 3_000,
    });
    const historicalFill = buildTwapFill({ fillId: 'historical-fill' });
    const hyperliquidHistory = buildTwapOrder({
      orderId: 'hyperliquid-history',
      providerId: 'hyperliquid',
      status: 'completed',
      startedAt: 2_500,
      fills: [historicalFill],
    });
    const myxHistory = buildTwapOrder({
      orderId: 'shared-order-id',
      providerId: 'myx',
      status: 'completed',
      startedAt: 2_000,
    });
    const hyperliquidTerminal = {
      ...hyperliquidActive,
      status: 'canceled' as const,
      lastUpdated: 4_000,
    };
    const recoveredHistory = {
      ...hyperliquidHistory,
      fills: [
        historicalFill,
        buildTwapFill({ fillId: 'recovered-fill', timestamp: 4_000 }),
      ],
      lastUpdated: 4_000,
    };
    mockController.getTwapOrders
      .mockResolvedValueOnce([
        hyperliquidActive,
        hyperliquidHistory,
        hyperliquidHistory,
        myxHistory,
      ])
      .mockResolvedValueOnce([myxHistory])
      .mockResolvedValueOnce([
        myxHistory,
        hyperliquidTerminal,
        recoveredHistory,
      ]);
    const { result } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([
        hyperliquidActive,
        hyperliquidHistory,
        myxHistory,
      ]),
    );

    // Act: this is indistinguishable from Hyperliquid rejecting while MYX
    // returns its successful partition.
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([
      hyperliquidActive,
      hyperliquidHistory,
      myxHistory,
    ]);
    expect(result.current.twapOrders[1].fills).toStrictEqual([historicalFill]);
    expect(result.current.error).not.toBeNull();

    // Act: a later response containing the provider confirms terminal state.
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([
      hyperliquidTerminal,
      recoveredHistory,
      myxHistory,
    ]);
    expect(result.current.error).toBeNull();
  });

  it('accepts an empty direct-provider snapshot as authoritative', async () => {
    // Arrange
    const activeOrder = buildTwapOrder({ providerId: 'hyperliquid' });
    mockController.getTwapOrders
      .mockResolvedValueOnce([activeOrder])
      .mockResolvedValueOnce([]);
    const { result } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([activeOrder]),
    );

    // Act
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('coalesces the initial subscription read after each identity start', async () => {
    // Arrange
    const firstIdentityOrder = buildTwapOrder({ orderId: 'first-identity' });
    const secondIdentityOrder = buildTwapOrder({ orderId: 'second-identity' });
    mockController.getTwapOrders
      .mockResolvedValueOnce([firstIdentityOrder])
      .mockResolvedValueOnce([secondIdentityOrder]);
    const { result, rerender } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );

    // Assert
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([firstIdentityOrder]),
    );
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);

    // Act
    mockSelectedAddress = '0xdef';
    rerender();

    // Assert
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([secondIdentityOrder]),
    );
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(2);
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

  it('coalesces overlapping manual refreshes', async () => {
    // Arrange
    let resolveRead: ((orders: TwapOrder[]) => void) | undefined;
    const pendingRead = new Promise<TwapOrder[]>((resolve) => {
      resolveRead = resolve;
    });
    const refreshedOrder = buildTwapOrder({ orderId: 'refreshed' });
    mockController.getTwapOrders.mockReturnValueOnce(pendingRead);
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ skipInitialFetch: true }),
    );
    let firstRefresh: Promise<void> | undefined;
    let secondRefresh: Promise<void> | undefined;

    // Act
    act(() => {
      firstRefresh = result.current.refresh();
      secondRefresh = result.current.refresh();
    });
    await act(async () => {
      resolveRead?.([refreshedOrder]);
      await Promise.all([firstRefresh, secondRefresh]);
    });

    // Assert
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);
    expect(result.current.twapOrders).toStrictEqual([refreshedOrder]);
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
      usePerpsTwapOrders({ enableLiveUpdates: true, skipInitialFetch: true }),
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
    const fill = buildTwapFill({ fillId: 'f1' });
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
      usePerpsTwapOrders({ enableLiveUpdates: true }),
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

  it('retains non-default-provider schedules after a default-provider stream update', async () => {
    // Arrange
    const hyperliquidOrder = buildTwapOrder({
      orderId: 'hyperliquid-order',
      providerId: 'hyperliquid',
      startedAt: 2_000,
    });
    const myxOrder = buildTwapOrder({
      orderId: 'myx-order',
      providerId: 'myx',
      startedAt: 1_000,
    });
    mockController.getTwapOrders.mockResolvedValue([
      hyperliquidOrder,
      myxOrder,
    ]);
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        pushStreamed = params.callback;
        return jest.fn();
      },
    );
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() => expect(result.current.twapOrders).toHaveLength(2));

    // Act
    await act(async () => {
      pushStreamed?.([
        { ...hyperliquidOrder, executedSize: '5', lastUpdated: 3_000 },
      ]);
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([
      { ...hyperliquidOrder, executedSize: '5', lastUpdated: 3_000 },
      myxOrder,
    ]);
  });

  it('retains fills by provider and order ID when venue order IDs collide', async () => {
    // Arrange
    const hyperliquidFill = buildTwapFill({ fillId: 'hyperliquid-fill' });
    const myxFill = buildTwapFill({ fillId: 'myx-fill' });
    const hyperliquidOrder = buildTwapOrder({
      providerId: 'hyperliquid',
      fills: [hyperliquidFill],
    });
    const myxOrder = buildTwapOrder({ providerId: 'myx', fills: [myxFill] });
    mockController.getTwapOrders.mockResolvedValue([
      hyperliquidOrder,
      myxOrder,
    ]);
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(
      (params: { callback: (orders: TwapOrder[]) => void }) => {
        pushStreamed = params.callback;
        return jest.fn();
      },
    );
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() => expect(result.current.twapOrders).toHaveLength(2));

    // Act
    await act(async () => {
      pushStreamed?.([{ ...hyperliquidOrder, fills: [] }]);
    });

    // Assert
    expect(
      result.current.twapOrders.find(
        (order) => order.providerId === 'hyperliquid',
      )?.fills,
    ).toStrictEqual([hyperliquidFill]);
    expect(
      result.current.twapOrders.find((order) => order.providerId === 'myx')
        ?.fills,
    ).toStrictEqual([myxFill]);
  });

  describe('live-update interval behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('keeps bounded REST refreshes running after a stream update', async () => {
      // Arrange
      mockController.subscribeToTwapOrders.mockImplementation(
        (params: { callback: (orders: TwapOrder[]) => void }) => {
          params.callback([buildTwapOrder({ orderId: 'streamed' })]);
          return jest.fn();
        },
      );

      // Act
      const { unmount } = renderHook(() =>
        usePerpsTwapOrders({
          enableLiveUpdates: true,
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

    it('pauses interval reads during confirmation and resumes without restarting the stream', async () => {
      // Arrange
      const { rerender, unmount } = renderHook(
        ({ isPaused }: { isPaused: boolean }) =>
          usePerpsTwapOrders({
            enableLiveUpdates: true,
            pollingInterval: 1000,
            pauseLiveRestReconciliation: isPaused,
            skipInitialFetch: true,
          }),
        { initialProps: { isPaused: false } },
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);

      // Act: opening confirmation clears the interval but leaves the stream.
      rerender({ isPaused: true });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2500);
      });

      // Assert
      expect(mockController.getTwapOrders).toHaveBeenCalledTimes(1);
      expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(1);

      // Act: closing confirmation immediately reconciles and restarts cadence.
      rerender({ isPaused: false });
      await act(async () => {
        await Promise.resolve();
      });
      expect(mockController.getTwapOrders).toHaveBeenCalledTimes(2);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(1000);
      });

      // Assert
      expect(mockController.getTwapOrders).toHaveBeenCalledTimes(3);
      expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(1);
      unmount();
    });
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

  it('rejects a refresh callback captured before an identity change', async () => {
    // Arrange
    const firstIdentityOrder = buildTwapOrder({ orderId: 'first-identity' });
    const secondIdentityOrder = buildTwapOrder({ orderId: 'second-identity' });
    mockController.getTwapOrders
      .mockResolvedValueOnce([firstIdentityOrder])
      .mockResolvedValueOnce([secondIdentityOrder]);
    const { result, rerender } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([firstIdentityOrder]),
    );
    const staleRefresh = result.current.refresh;

    // Act
    mockProvider = 'aggregated';
    rerender();
    await act(async () => {
      await staleRefresh();
    });

    // Assert
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([secondIdentityOrder]),
    );
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(2);
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
      usePerpsTwapOrders({
        enableLiveUpdates: true,
        skipInitialFetch: true,
      }),
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
