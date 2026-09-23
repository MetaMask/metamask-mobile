import { act, renderHook } from '@testing-library/react-native';
import type { Order, Position } from '@metamask/perps-controller';
import { hasRecentPerpsAction } from '../utils/perpsActivityStorage';
import { getPreloadedData } from './stream/hasCachedPerpsData';
import {
  evaluateIsActivePerpsTrader,
  useIsActivePerpsTrader,
} from './useIsActivePerpsTrader';

jest.mock('./stream/hasCachedPerpsData', () => ({
  getPreloadedData: jest.fn(),
}));

jest.mock('../utils/perpsActivityStorage', () => ({
  hasRecentPerpsAction: jest.fn(() => false),
}));

const mockPositionsSnapshot = jest.fn<Position[] | null, []>(() => null);
const mockOrdersSnapshot = jest.fn<Order[] | null, []>(() => null);
const mockStreamListeners = {
  positions: new Set<(data: Position[] | null) => void>(),
  orders: new Set<(data: Order[] | null) => void>(),
};
jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: () => ({
    positions: {
      getSnapshot: () => mockPositionsSnapshot(),
      subscribe: ({
        callback,
      }: {
        callback: (data: Position[] | null) => void;
      }) => {
        mockStreamListeners.positions.add(callback);
        return () => {
          mockStreamListeners.positions.delete(callback);
        };
      },
    },
    orders: {
      getSnapshot: () => mockOrdersSnapshot(),
      subscribe: ({
        callback,
      }: {
        callback: (data: Order[] | null) => void;
      }) => {
        mockStreamListeners.orders.add(callback);
        return () => {
          mockStreamListeners.orders.delete(callback);
        };
      },
    },
  }),
}));

const mockSelectedAddress = { current: '0xdev1' as string | undefined };
jest.mock('react-redux', () => ({
  useSelector: () => mockSelectedAddress.current,
}));

const mockFocusEffect = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => mockFocusEffect(callback),
}));

const mockGetPreloadedData = getPreloadedData as jest.MockedFunction<
  typeof getPreloadedData
>;
const mockHasRecentPerpsAction = hasRecentPerpsAction as jest.MockedFunction<
  typeof hasRecentPerpsAction
>;

/** Feeds the two cache fields the hook reads, in the order it reads them. */
const givenCache = ({
  positions,
  orders,
}: {
  positions?: Position[] | null;
  orders?: Order[] | null;
}) => {
  mockGetPreloadedData.mockImplementation((field) => {
    if (field === 'cachedPositions') {
      return positions ?? null;
    }
    if (field === 'cachedOrders') {
      return orders ?? null;
    }
    return null;
  });
};

const aPosition = { symbol: 'ETH' } as Position;
const anOrder = { symbol: 'ETH' } as Order;

describe('useIsActivePerpsTrader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRecentPerpsAction.mockReturnValue(false);
    mockPositionsSnapshot.mockReturnValue(null);
    mockOrdersSnapshot.mockReturnValue(null);
    mockSelectedAddress.current = '0xdev1';
    mockStreamListeners.positions.clear();
    mockStreamListeners.orders.clear();
    givenCache({});
  });

  const runFocus = () => {
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [
      () => (() => void) | void,
    ];
    let cleanup: (() => void) | void;
    act(() => {
      cleanup = focusCallback();
    });
    return cleanup;
  };

  const emitStream = ({
    positions,
    orders,
  }: {
    positions?: Position[] | null;
    orders?: Order[] | null;
  }) => {
    if (positions !== undefined) {
      mockPositionsSnapshot.mockReturnValue(positions);
    }
    if (orders !== undefined) {
      mockOrdersSnapshot.mockReturnValue(orders);
    }
    act(() => {
      if (positions !== undefined) {
        [...mockStreamListeners.positions].forEach((callback) =>
          callback(positions),
        );
      }
      if (orders !== undefined) {
        [...mockStreamListeners.orders].forEach((callback) => callback(orders));
      }
    });
  };

  describe('evaluateIsActivePerpsTrader', () => {
    it('is true with an open position', () => {
      givenCache({ positions: [aPosition] });

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });

    it('is true with a resting order and no position', () => {
      givenCache({ positions: [], orders: [anOrder] });

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });

    it('is true with a recent action but no position or order', () => {
      givenCache({ positions: [], orders: [] });
      mockHasRecentPerpsAction.mockReturnValue(true);

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });

    it('is false with no position, no order, and no recent action', () => {
      givenCache({ positions: [], orders: [] });

      expect(evaluateIsActivePerpsTrader()).toBe(false);
    });

    it('is false when the cache is cold and nothing was recorded', () => {
      givenCache({ positions: null, orders: null });

      expect(evaluateIsActivePerpsTrader()).toBe(false);
    });

    it('short-circuits on positions without reading the action timestamp', () => {
      givenCache({ positions: [aPosition] });

      evaluateIsActivePerpsTrader();

      expect(mockHasRecentPerpsAction).not.toHaveBeenCalled();
    });

    it('is true for a position the live stream has but the cache snapshot has not caught up to', () => {
      givenCache({ positions: [], orders: [] });
      mockPositionsSnapshot.mockReturnValue([aPosition]);

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });

    it('is true for a resting order the live stream has before the cache does', () => {
      givenCache({ positions: [], orders: [] });
      mockOrdersSnapshot.mockReturnValue([anOrder]);

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });

    it('trusts an empty live snapshot over a stale non-empty cache', () => {
      givenCache({ positions: [aPosition], orders: [anOrder] });
      mockPositionsSnapshot.mockReturnValue([]);
      mockOrdersSnapshot.mockReturnValue([]);

      expect(evaluateIsActivePerpsTrader()).toBe(false);
    });

    it('falls back to the cache when the stream has no data yet', () => {
      givenCache({ positions: [aPosition] });
      mockPositionsSnapshot.mockReturnValue(null);

      expect(evaluateIsActivePerpsTrader()).toBe(true);
    });
  });

  it('resolves during the first render so section order never reshuffles', () => {
    givenCache({ positions: [aPosition] });

    const { result } = renderHook(() => useIsActivePerpsTrader());

    expect(result.current).toBe(true);
  });

  it('returns false on the first render for an inactive user', () => {
    givenCache({ positions: [], orders: [] });

    const { result } = renderHook(() => useIsActivePerpsTrader());

    expect(result.current).toBe(false);
  });

  it('re-evaluates when the screen regains focus', () => {
    givenCache({ positions: [], orders: [] });
    const { result } = renderHook(() => useIsActivePerpsTrader());
    expect(result.current).toBe(false);

    // The user opened a position elsewhere, then came back to wallet home.
    givenCache({ positions: [aPosition] });
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];
    act(() => focusCallback());

    expect(result.current).toBe(true);
  });

  it('drops back to false when eligibility lapses before the next focus', () => {
    givenCache({ positions: [aPosition] });
    const { result } = renderHook(() => useIsActivePerpsTrader());
    expect(result.current).toBe(true);

    givenCache({ positions: [], orders: [] });
    const [focusCallback] = mockFocusEffect.mock.calls.at(-1) as [() => void];
    act(() => focusCallback());

    expect(result.current).toBe(false);
  });

  it('does not subscribe on the first focus when the stream has not loaded', () => {
    givenCache({ positions: null, orders: null });
    const { result } = renderHook(() => useIsActivePerpsTrader());

    runFocus();

    expect(result.current).toBe(false);
    expect(mockStreamListeners.positions.size).toBe(0);
    expect(mockStreamListeners.orders.size).toBe(0);
  });

  it('subscribes for the next account when a later focus finds the stream cleared', () => {
    givenCache({ positions: [], orders: [] });
    const { result } = renderHook(() => useIsActivePerpsTrader());
    runFocus();

    givenCache({ positions: null, orders: null });
    mockPositionsSnapshot.mockReturnValue(null);
    mockOrdersSnapshot.mockReturnValue(null);
    runFocus();

    expect(result.current).toBe(false);
    expect(mockStreamListeners.positions.size).toBe(1);
    expect(mockStreamListeners.orders.size).toBe(1);
  });

  it('becomes eligible once the switched-back account positions load', () => {
    givenCache({ positions: [], orders: [] });
    const { result } = renderHook(() => useIsActivePerpsTrader());
    runFocus();

    givenCache({ positions: null, orders: null });
    mockPositionsSnapshot.mockReturnValue(null);
    mockOrdersSnapshot.mockReturnValue(null);
    runFocus();
    expect(result.current).toBe(false);

    givenCache({ positions: null, orders: null });
    emitStream({ positions: [aPosition], orders: [] });

    expect(result.current).toBe(true);
    expect(mockStreamListeners.positions.size).toBe(0);
    expect(mockStreamListeners.orders.size).toBe(0);
  });

  it('stays eligible when a later tick empties the book after the stream has settled', () => {
    givenCache({ positions: [], orders: [] });
    const { result } = renderHook(() => useIsActivePerpsTrader());
    runFocus();

    givenCache({ positions: null, orders: null });
    runFocus();
    emitStream({ positions: [aPosition], orders: [] });
    expect(result.current).toBe(true);

    emitStream({ positions: [] });

    expect(result.current).toBe(true);
  });

  it('applies a loaded account when the selected address changes without a new focus', () => {
    givenCache({ positions: [], orders: [] });
    const { result, rerender } = renderHook(() => useIsActivePerpsTrader());
    runFocus();
    expect(result.current).toBe(false);

    mockSelectedAddress.current = '0xdev2';
    givenCache({ positions: null, orders: null });
    mockPositionsSnapshot.mockReturnValue(null);
    mockOrdersSnapshot.mockReturnValue(null);
    rerender({});

    expect(result.current).toBe(false);
    emitStream({ positions: [aPosition], orders: [] });

    expect(result.current).toBe(true);
  });
});
