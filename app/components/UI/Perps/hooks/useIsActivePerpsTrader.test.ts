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
jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: () => ({
    positions: { getSnapshot: () => mockPositionsSnapshot() },
    orders: { getSnapshot: () => mockOrdersSnapshot() },
  }),
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
    givenCache({});
  });

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
});
