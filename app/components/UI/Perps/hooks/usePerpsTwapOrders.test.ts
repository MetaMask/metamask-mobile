import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import { usePerpsTwapOrders } from './usePerpsTwapOrders';

let mockSelectedAddress = '0xabc';
let mockProvider = 'hyperliquid';
let mockNetwork = 'testnet';
let mockMarketContextKey = 'testnet|hyperliquid|0|1';
let mockIsMarketReady = true;
let mockIsUserReady = true;

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
    key: mockMarketContextKey,
    identityKey: 'testnet|hyperliquid|0',
    isReady: mockIsMarketReady,
    isUserReady: mockIsUserReady,
    isConnectionInitialized: mockIsUserReady,
  }),
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
    mockMarketContextKey = 'testnet|hyperliquid|0|1';
    mockIsMarketReady = true;
    mockIsUserReady = true;
    mockController.getTwapOrders.mockResolvedValue([buildTwapOrder()]);
    mockController.subscribeToTwapOrders.mockReturnValue(jest.fn());
  });

  afterEach(() => {
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

  it('retains a terminal-only provider partition through partial reads until authoritative recovery', async () => {
    // Arrange
    mockProvider = 'aggregated';
    const retainedFill = buildTwapFill({ fillId: 'retained-fill' });
    const staleHyperliquidHistory = buildTwapOrder({
      orderId: 'hyperliquid-history',
      providerId: 'hyperliquid',
      status: 'completed',
      fills: [retainedFill],
    });
    const myxHistory = buildTwapOrder({
      orderId: 'myx-history',
      providerId: 'myx',
      status: 'completed',
    });
    const recoveredHyperliquidHistory = buildTwapOrder({
      orderId: 'hyperliquid-recovered',
      providerId: 'hyperliquid',
      status: 'canceled',
      startedAt: 3_000,
    });
    mockController.getTwapOrders
      .mockResolvedValueOnce([staleHyperliquidHistory, myxHistory])
      .mockResolvedValueOnce([myxHistory])
      .mockResolvedValueOnce([myxHistory, recoveredHyperliquidHistory]);
    const { result } = renderHook(() => usePerpsTwapOrders());
    await waitFor(() => expect(result.current.twapOrders).toHaveLength(2));

    // Act: Hyperliquid's terminal-only partition is transiently omitted.
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(result.current.twapOrders).toContainEqual(staleHyperliquidHistory);
    expect(result.current.twapOrders[1].fills).toStrictEqual([retainedFill]);
    expect(result.current.error).toBe(
      'Unable to confirm active TWAP schedules for every provider',
    );

    // Act: any returned Hyperliquid row authoritatively replaces that partition.
    await act(async () => {
      await result.current.refresh();
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([
      recoveredHyperliquidHistory,
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

  it('keeps a newer terminal REST schedule when an older active stream row arrives', async () => {
    // Arrange
    const restFill = buildTwapFill({ fillId: 'rest-fill' });
    const streamFill = buildTwapFill({ fillId: 'stream-fill' });
    const terminalRestOrder = buildTwapOrder({
      status: 'canceled',
      lastUpdated: 5_000,
      fills: [restFill],
    });
    mockController.getTwapOrders.mockResolvedValue([terminalRestOrder]);
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([terminalRestOrder]),
    );

    // Act
    act(() => {
      pushStreamed?.([
        buildTwapOrder({ lastUpdated: 4_000, fills: [streamFill] }),
      ]);
    });

    // Assert: schedule fields come from REST while fills are a union.
    expect(result.current.twapOrders[0]).toMatchObject({
      status: 'canceled',
      lastUpdated: 5_000,
    });
    expect(result.current.twapOrders[0].fills).toHaveLength(2);
    expect(result.current.twapOrders[0].fills).toEqual(
      expect.arrayContaining([restFill, streamFill]),
    );
  });

  it('keeps a newer terminal stream schedule when an older active REST row resolves later', async () => {
    // Arrange
    let resolveRest: ((orders: TwapOrder[]) => void) | undefined;
    mockController.getTwapOrders.mockReturnValue(
      new Promise<TwapOrder[]>((resolve) => {
        resolveRest = resolve;
      }),
    );
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const streamFill = buildTwapFill({ fillId: 'stream-fill' });
    const terminalStreamOrder = buildTwapOrder({
      status: 'completed',
      lastUpdated: 6_000,
      fills: [streamFill],
    });
    const restFill = buildTwapFill({ fillId: 'rest-fill' });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true, skipInitialFetch: true }),
    );
    await waitFor(() =>
      expect(mockController.getTwapOrders).toHaveBeenCalled(),
    );

    // Act
    act(() => pushStreamed?.([terminalStreamOrder]));
    await act(async () => {
      resolveRest?.([
        buildTwapOrder({ lastUpdated: 4_000, fills: [restFill] }),
      ]);
    });

    // Assert
    expect(result.current.twapOrders[0]).toMatchObject({
      status: 'completed',
      lastUpdated: 6_000,
    });
    expect(result.current.twapOrders[0].fills).toHaveLength(2);
    expect(result.current.twapOrders[0].fills).toEqual(
      expect.arrayContaining([restFill, streamFill]),
    );
  });

  it('uses the incoming schedule fields and unions fills at equal timestamps', async () => {
    // Arrange
    const restFill = buildTwapFill({ fillId: 'rest-fill' });
    const streamFill = buildTwapFill({ fillId: 'stream-fill' });
    const restOrder = buildTwapOrder({
      executedSize: '4',
      lastUpdated: 5_000,
      fills: [restFill],
    });
    mockController.getTwapOrders.mockResolvedValue([restOrder]);
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() =>
      expect(result.current.twapOrders).toStrictEqual([restOrder]),
    );

    // Act
    act(() => {
      pushStreamed?.([
        buildTwapOrder({
          status: 'completed_underfilled',
          executedSize: '7',
          lastUpdated: 5_000,
          fills: [streamFill],
        }),
      ]);
    });

    // Assert: equal versions have a documented, deterministic incoming winner.
    expect(result.current.twapOrders[0]).toMatchObject({
      status: 'completed_underfilled',
      executedSize: '7',
      fills: [restFill, streamFill],
    });
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

  it('retains unbounded REST terminal history through stream snapshots and deltas', async () => {
    // Arrange: the venue stream caps terminal history at 100 rows, while REST
    // has more history than that cap.
    const restHistory = Array.from({ length: 105 }, (_, index) =>
      buildTwapOrder({
        orderId: `history-${index}`,
        providerId: 'hyperliquid',
        status: 'completed',
        startedAt: index,
      }),
    );
    const activeOrder = buildTwapOrder({
      orderId: 'active-order',
      providerId: 'hyperliquid',
      startedAt: 1_000,
    });
    mockController.getTwapOrders.mockResolvedValue([
      activeOrder,
      ...restHistory,
    ]);
    let pushStreamed:
      | ((orders: TwapOrder[], isSnapshot?: boolean) => void)
      | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() => expect(result.current.twapOrders).toHaveLength(106));

    // Act: a capped snapshot includes only the newest 100 terminal rows and a
    // newer version of the active schedule.
    act(() => {
      pushStreamed?.(
        [
          { ...activeOrder, executedSize: '7', lastUpdated: 3_000 },
          ...restHistory.slice(5),
        ],
        true,
      );
    });

    // Assert: all 105 REST terminal rows survive and the active stream record
    // wins. A later delta also overlays without replacing history.
    expect(result.current.twapOrders).toHaveLength(106);
    expect(
      result.current.twapOrders.find((order) => order.orderId === 'history-0'),
    ).toStrictEqual(restHistory[0]);
    expect(
      result.current.twapOrders.find(
        (order) => order.orderId === 'active-order',
      )?.executedSize,
    ).toBe('7');

    act(() => {
      pushStreamed?.(
        [{ ...activeOrder, status: 'completed', lastUpdated: 4_000 }],
        false,
      );
    });
    expect(result.current.twapOrders).toHaveLength(106);
    expect(
      result.current.twapOrders.find(
        (order) => order.orderId === 'active-order',
      )?.status,
    ).toBe('completed');
  });

  it('merges deferred REST fills and provider recovery into newer streamed state', async () => {
    // Arrange
    mockProvider = 'aggregated';
    const streamOrder = buildTwapOrder({
      orderId: 'shared',
      providerId: 'hyperliquid',
      executedSize: '8',
      status: 'active',
      lastUpdated: 8_000,
      fills: [buildTwapFill({ fillId: 'prior-stream-fill' })],
    });
    const priorStreamFill = streamOrder.fills[0];
    const restFill = buildTwapFill({ fillId: 'rest-fill' });
    const staleRestOrder = {
      ...streamOrder,
      executedSize: '4',
      lastUpdated: 4_000,
      fills: [priorStreamFill, restFill],
    };
    const recoveredProviderOrder = buildTwapOrder({
      orderId: 'myx-recovered',
      providerId: 'myx',
      status: 'completed',
      startedAt: 2_000,
    });
    let resolveRest: ((orders: TwapOrder[]) => void) | undefined;
    mockController.getTwapOrders.mockReturnValue(
      new Promise<TwapOrder[]>((resolve) => {
        resolveRest = resolve;
      }),
    );
    let pushStreamed:
      | ((orders: TwapOrder[], isSnapshot?: boolean) => void)
      | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({
        enableLiveUpdates: true,
        skipInitialFetch: true,
      }),
    );
    await waitFor(() =>
      expect(mockController.getTwapOrders).toHaveBeenCalled(),
    );

    // Act: stream commits first; the older REST response resolves later with
    // complementary fills and another provider partition.
    act(() => {
      pushStreamed?.([streamOrder], true);
    });
    await act(async () => {
      resolveRest?.([staleRestOrder, recoveredProviderOrder]);
    });

    // Assert
    const mergedStreamOrder = result.current.twapOrders.find(
      (order) => order.providerId === 'hyperliquid',
    );
    expect(mergedStreamOrder).toMatchObject({
      executedSize: '8',
      lastUpdated: 8_000,
      fills: [priorStreamFill, restFill],
    });
    expect(result.current.twapOrders).toContainEqual(recoveredProviderOrder);
  });

  it('uses direct-provider ownership for an empty authoritative snapshot', async () => {
    // Arrange
    mockProvider = 'myx';
    const myxActive = buildTwapOrder({ providerId: 'myx' });
    mockController.getTwapOrders.mockResolvedValue([myxActive]);
    let pushStreamed:
      | ((orders: TwapOrder[], isSnapshot?: boolean) => void)
      | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() =>
      expect(result.current.twapOrders).toContainEqual(myxActive),
    );

    // Act
    act(() => pushStreamed?.([], true));

    // Assert
    expect(result.current.twapOrders).toStrictEqual([]);
  });

  it('partitions aggregated snapshots by streamed row provider identity', async () => {
    // Arrange
    mockProvider = 'aggregated';
    const hyperliquidActive = buildTwapOrder({
      orderId: 'hyperliquid-active',
      providerId: 'hyperliquid',
      startedAt: 2_000,
    });
    const myxActive = buildTwapOrder({
      orderId: 'myx-active',
      providerId: 'myx',
      startedAt: 1_000,
    });
    const myxHistory = buildTwapOrder({
      orderId: 'myx-history',
      providerId: 'myx',
      status: 'completed',
      startedAt: 1_000,
    });
    mockController.getTwapOrders.mockResolvedValue([
      hyperliquidActive,
      myxActive,
      myxHistory,
    ]);
    let pushStreamed:
      | ((orders: TwapOrder[], isSnapshot?: boolean) => void)
      | undefined;
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return jest.fn();
    });
    const { result } = renderHook(() =>
      usePerpsTwapOrders({ enableLiveUpdates: true }),
    );
    await waitFor(() => expect(result.current.twapOrders).toHaveLength(3));

    // Act: this snapshot owns MYX only. It removes the absent MYX active row,
    // retains capped MYX history, and cannot corrupt Hyperliquid.
    act(() => pushStreamed?.([myxHistory], true));

    // Assert
    expect(result.current.twapOrders).toStrictEqual([
      hyperliquidActive,
      myxHistory,
    ]);
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

  it('discovers an externally active schedule after an empty read without remounting', async () => {
    // Arrange
    jest.useFakeTimers();
    const discoveredOrder = buildTwapOrder({ orderId: 'external-twap' });
    mockController.getTwapOrders
      .mockResolvedValueOnce([])
      .mockResolvedValue([discoveredOrder]);
    const { result, unmount } = renderHook(() =>
      usePerpsTwapOrders({
        enableDiscovery: true,
        discoveryInterval: 1000,
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.twapOrders).toStrictEqual([]);

    // Act
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    // Assert
    expect(result.current.twapOrders).toStrictEqual([discoveredOrder]);
    expect(mockController.getTwapOrders).toHaveBeenCalledTimes(2);
    unmount();
  });
  it('keeps the subscription alive when skipInitialFetch changes', async () => {
    // Arrange
    let pushStreamed: ((orders: TwapOrder[]) => void) | undefined;
    const unsubscribe = jest.fn();
    mockController.subscribeToTwapOrders.mockImplementation(({ callback }) => {
      pushStreamed = callback;
      return unsubscribe;
    });
    const { result, rerender, unmount } = renderHook(
      ({ skipInitialFetch }: { skipInitialFetch: boolean }) =>
        usePerpsTwapOrders({
          enableLiveUpdates: true,
          pauseLiveRestReconciliation: true,
          skipInitialFetch,
        }),
      { initialProps: { skipInitialFetch: true } },
    );
    const firstStreamOrder = buildTwapOrder({ orderId: 'before-toggle' });
    act(() => pushStreamed?.([firstStreamOrder]));
    expect(result.current.twapOrders).toStrictEqual([firstStreamOrder]);

    // Act
    rerender({ skipInitialFetch: false });
    await waitFor(() =>
      expect(mockController.getTwapOrders).toHaveBeenCalled(),
    );
    const secondStreamOrder = buildTwapOrder({
      orderId: 'after-toggle',
      lastUpdated: 3_000,
    });
    act(() => pushStreamed?.([secondStreamOrder]));

    // Assert
    expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(result.current.twapOrders).toContainEqual(secondStreamOrder);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('waits for reconnect readiness and resubscribes after generation advances', () => {
    // Arrange
    const firstUnsubscribe = jest.fn();
    const secondUnsubscribe = jest.fn();
    mockController.subscribeToTwapOrders
      .mockReturnValueOnce(firstUnsubscribe)
      .mockReturnValueOnce(secondUnsubscribe);
    const { rerender, unmount } = renderHook(() =>
      usePerpsTwapOrders({
        enableLiveUpdates: true,
        pauseLiveRestReconciliation: true,
        skipInitialFetch: true,
      }),
    );
    expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(1);

    // Act: generation advances before the replacement connection is ready.
    mockMarketContextKey = 'testnet|hyperliquid|0|2';
    mockIsMarketReady = false;
    rerender();

    // Assert: the old listener is gone and no replacement attaches early.
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(1);

    // Act: the same-identity replacement connection finishes initialization.
    mockIsMarketReady = true;
    rerender();

    // Assert
    expect(mockController.subscribeToTwapOrders).toHaveBeenCalledTimes(2);
    expect(firstUnsubscribe.mock.invocationCallOrder[0]).toBeLessThan(
      mockController.subscribeToTwapOrders.mock.invocationCallOrder[1],
    );
    unmount();
    expect(secondUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
