/**
 * [TAT-3294] BUG REPRODUCTION MARKER
 *
 * Deterministic reproduction of the open-positions / open-orders display cap on
 * the Perps home screen. `usePerpsHomeData` slices positions and orders to
 * HOME_SCREEN_CONFIG.PositionsCarouselLimit / OrdersCarouselLimit (both 10), so
 * a wallet with 11+ open positions or orders silently loses everything past
 * index 9. PerpsHomeView renders the returned arrays with `.map()` inside a
 * ScrollView, so there is no "see all" path to recover the hidden entries.
 *
 * This file asserts the CURRENT (buggy) behaviour — it PASSES on pre-fix code,
 * proving the bug exists. It is removed in the marker-cleanup commit once the
 * fix lands. See app/components/UI/Perps/hooks/usePerpsHomeData.test.ts for the
 * permanent fix-coverage tests (12 in → 12 out).
 */
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  sortMarkets,
  type Order,
  type Position,
} from '@metamask/perps-controller';
import {
  usePerpsLiveFills,
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from './stream';
import { usePerpsHomeData } from './usePerpsHomeData';
import { usePerpsMarkets } from './usePerpsMarkets';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';

jest.mock('./stream');
jest.mock('./usePerpsMarkets');
jest.mock('@metamask/perps-controller', () => ({
  ...jest.requireActual('@metamask/perps-controller'),
  sortMarkets: jest.fn(),
}));
jest.mock('react-redux');
jest.mock('../selectors/perpsController');
jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isInitialized: true,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
  })),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      getActiveProvider: jest.fn(),
      getActiveProviderOrNull: jest.fn(),
      getOrderFills: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockUsePerpsLivePositions = usePerpsLivePositions as jest.MockedFunction<
  typeof usePerpsLivePositions
>;
const mockUsePerpsLiveOrders = usePerpsLiveOrders as jest.MockedFunction<
  typeof usePerpsLiveOrders
>;
const mockUsePerpsLiveFills = usePerpsLiveFills as jest.MockedFunction<
  typeof usePerpsLiveFills
>;
const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;
const mockSortMarkets = sortMarkets as jest.MockedFunction<typeof sortMarkets>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectPerpsWatchlistMarkets =
  selectPerpsWatchlistMarkets as jest.MockedFunction<
    typeof selectPerpsWatchlistMarkets
  >;

const createPosition = (symbol: string): Position =>
  ({
    symbol,
    size: '0.5',
    entryPrice: '45000',
    positionValue: '22500',
    unrealizedPnl: '250',
    returnOnEquity: '0.05',
    leverage: { type: 'cross', value: 2, rawUsd: '3000' },
    liquidationPrice: '40000',
    marginUsed: '1500',
    maxLeverage: 100,
    cumulativeFunding: { allTime: '50', sinceOpen: '10', sinceChange: '5' },
    takeProfitCount: 0,
    stopLossCount: 0,
  }) as Position;

const createOrder = (orderId: string, symbol: string): Order =>
  ({
    orderId,
    symbol,
    side: 'buy',
    orderType: 'limit',
    size: '0.1',
    originalSize: '0.1',
    price: '46000',
    filledSize: '0',
    remainingSize: '0.1',
    status: 'open',
    timestamp: 1234567890,
  }) as Order;

describe('[TAT-3294] usePerpsHomeData display cap reproduction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePerpsLiveFills.mockReturnValue({
      fills: [],
      isInitialLoading: false,
    });
    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockSortMarkets.mockImplementation(({ markets }) => markets);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsWatchlistMarkets) {
        return mockSelectPerpsWatchlistMarkets({} as never);
      }
      return undefined as never;
    });
    mockSelectPerpsWatchlistMarkets.mockReturnValue([]);
  });

  it('caps open positions at ten when twelve are open (bug)', () => {
    const twelvePositions = Array.from({ length: 12 }, (_, i) =>
      createPosition(`COIN${i}`),
    );
    mockUsePerpsLivePositions.mockReturnValue({
      positions: twelvePositions,
      isInitialLoading: false,
    });
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });

    const { result } = renderHook(() => usePerpsHomeData({}));

    // BUG: only 10 of 12 positions survive — positions 11 and 12 are hidden.
    expect(result.current.positions).toHaveLength(10);
  });

  it('caps open orders at ten when twelve are open (bug)', () => {
    const twelveOrders = Array.from({ length: 12 }, (_, i) =>
      createOrder(`order-${i}`, `COIN${i}`),
    );
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: twelveOrders,
      isInitialLoading: false,
    });

    const { result } = renderHook(() => usePerpsHomeData({}));

    // BUG: only 10 of 12 orders survive — orders 11 and 12 are hidden.
    expect(result.current.orders).toHaveLength(10);
  });
});
