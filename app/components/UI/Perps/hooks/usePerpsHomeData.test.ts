import { act, renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import type {
  Order,
  OrderFill,
  PerpsMarketData,
  Position,
} from '../controllers/types';
import type { PerpsTransaction } from '../types/transactionHistory';
import { sortMarkets, type SortField } from '../utils/sortMarkets';
import { FillType } from '../components/PerpsTransactionItem/PerpsTransactionItem';

// Type for markets with volumeNumber (returned by usePerpsMarkets)
type PerpsMarketDataWithVolumeNumber = PerpsMarketData & {
  volumeNumber: number;
};
import {
  usePerpsLiveFills,
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from './stream';
import { usePerpsHomeData } from './usePerpsHomeData';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsTransactionHistory } from './usePerpsTransactionHistory';
import {
  selectPerpsWatchlistMarkets,
  selectPerpsMarketFilterPreferences,
} from '../selectors/perpsController';

// Mock dependencies
jest.mock('./stream');
jest.mock('./usePerpsMarkets');
jest.mock('../utils/sortMarkets');
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
jest.mock('./usePerpsTransactionHistory');

// Type mock functions
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
const mockUsePerpsTransactionHistory =
  usePerpsTransactionHistory as jest.MockedFunction<
    typeof usePerpsTransactionHistory
  >;
const mockSortMarkets = sortMarkets as jest.MockedFunction<typeof sortMarkets>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectPerpsWatchlistMarkets =
  selectPerpsWatchlistMarkets as jest.MockedFunction<
    typeof selectPerpsWatchlistMarkets
  >;
const mockSelectPerpsMarketFilterPreferences =
  selectPerpsMarketFilterPreferences as jest.MockedFunction<
    typeof selectPerpsMarketFilterPreferences
  >;

// Test data helper functions
const createMockPosition = (overrides: Partial<Position> = {}): Position => ({
  coin: 'BTC',
  size: '0.5',
  entryPrice: '45000',
  positionValue: '22500',
  unrealizedPnl: '250',
  returnOnEquity: '0.05',
  leverage: {
    type: 'cross',
    value: 2,
    rawUsd: '3000',
  },
  liquidationPrice: '40000',
  marginUsed: '1500',
  maxLeverage: 100,
  cumulativeFunding: {
    allTime: '50',
    sinceOpen: '10',
    sinceChange: '5',
  },
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: '12345',
  symbol: 'BTC',
  side: 'buy',
  orderType: 'limit',
  size: '0.1',
  originalSize: '0.1',
  price: '46000',
  filledSize: '0',
  remainingSize: '0.1',
  status: 'open',
  timestamp: 1234567890,
  ...overrides,
});

const createMockOrderFill = (
  overrides: Partial<OrderFill> = {},
): OrderFill => ({
  orderId: 'fill-123',
  symbol: 'ETH',
  side: 'buy',
  price: '3000',
  size: '1.0',
  pnl: '0',
  direction: 'Open Long', // Format expected by transformFillsToTransactions
  timestamp: 1234567890,
  fee: '10',
  feeToken: 'USDC',
  ...overrides,
});

const createMockMarket = (
  overrides: Partial<PerpsMarketDataWithVolumeNumber> = {},
): PerpsMarketDataWithVolumeNumber => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '40x',
  price: '$50,000.00',
  change24h: '+2.5%',
  change24hPercent: '2.5',
  volume: '$1.2B',
  volumeNumber: 1200000000,
  ...overrides,
});

describe('usePerpsHomeData', () => {
  let mockPositions: Position[];
  let mockOrders: Order[];
  let mockFills: OrderFill[];
  let mockTransactions: PerpsTransaction[];
  let mockMarkets: PerpsMarketDataWithVolumeNumber[];
  let mockRefreshMarkets: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock data
    mockPositions = [
      createMockPosition({ coin: 'BTC' }),
      createMockPosition({ coin: 'ETH' }),
    ];

    mockOrders = [
      createMockOrder({ symbol: 'BTC' }),
      createMockOrder({ symbol: 'SOL' }),
    ];

    // Create mock fills that will be transformed to transactions
    // Note: orderId is used as the transaction id, and timestamp must differ for sorting
    mockFills = [
      createMockOrderFill({
        orderId: 'fill-eth-1',
        symbol: 'ETH',
        timestamp: 1234567890,
      }),
      createMockOrderFill({
        orderId: 'fill-btc-1',
        symbol: 'BTC',
        timestamp: 1234567891,
      }),
    ];

    // Create expected mock transactions that match transformFillsToTransactions output
    // These are used for assertions in tests that still check mockTransactions
    mockTransactions = [
      {
        id: 'fill-btc-1', // Sorted by timestamp desc, so BTC (newer) comes first
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Opened long',
        subtitle: '1.0 BTC',
        timestamp: 1234567891,
        asset: 'BTC',
        fill: {
          shortTitle: 'Opened long',
          amount: '-$10.00',
          amountNumber: -10,
          isPositive: false,
          size: '1.0',
          entryPrice: '3000',
          pnl: '0',
          fee: '10',
          points: '0',
          feeToken: 'USDC',
          action: 'Opened',
          fillType: FillType.Standard,
        },
      },
      {
        id: 'fill-eth-1',
        type: 'trade' as const,
        category: 'position_open' as const,
        title: 'Opened long',
        subtitle: '1.0 ETH',
        timestamp: 1234567890,
        asset: 'ETH',
        fill: {
          shortTitle: 'Opened long',
          amount: '-$10.00',
          amountNumber: -10,
          isPositive: false,
          size: '1.0',
          entryPrice: '3000',
          pnl: '0',
          fee: '10',
          points: '0',
          feeToken: 'USDC',
          action: 'Opened',
          fillType: FillType.Standard,
        },
      },
    ];

    mockMarkets = [
      createMockMarket({
        symbol: 'BTC',
        name: 'Bitcoin',
        volume: '$1.2B',
        volumeNumber: 1200000000,
      }),
      createMockMarket({
        symbol: 'ETH',
        name: 'Ethereum',
        volume: '$900M',
        volumeNumber: 900000000,
      }),
      createMockMarket({
        symbol: 'SOL',
        name: 'Solana',
        volume: '$500M',
        volumeNumber: 500000000,
      }),
    ];

    mockRefreshMarkets = jest.fn().mockResolvedValue(undefined);

    // Setup default mock implementations
    mockUsePerpsLivePositions.mockReturnValue({
      positions: mockPositions,
      isInitialLoading: false,
    });

    mockUsePerpsLiveOrders.mockReturnValue({
      orders: mockOrders,
      isInitialLoading: false,
    });

    mockUsePerpsLiveFills.mockReturnValue({
      fills: mockFills,
      isInitialLoading: false,
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockMarkets,
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: mockRefreshMarkets,
    });

    mockUsePerpsTransactionHistory.mockReturnValue({
      transactions: mockTransactions,
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });

    // Mock sortMarkets to return markets as-is by default
    mockSortMarkets.mockImplementation(({ markets }) => markets);

    // Mock Redux selectors - call the appropriate mocked selector based on which selector is passed
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPerpsWatchlistMarkets) {
        return mockSelectPerpsWatchlistMarkets({} as never);
      }
      if (selector === selectPerpsMarketFilterPreferences) {
        return mockSelectPerpsMarketFilterPreferences({} as never);
      }
      throw new Error(`Unmocked selector called: ${selector.name || selector}`);
    });

    // Set default return values for the selectors
    mockSelectPerpsWatchlistMarkets.mockReturnValue(['BTC', 'ETH']);
    mockSelectPerpsMarketFilterPreferences.mockReturnValue('volume');
  });

  describe('Initial state and data loading', () => {
    it('returns initial data from all sources', () => {
      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.orders).toEqual(mockOrders);
      // recentActivity now comes from WebSocket fills (transformed to transactions)
      expect(result.current.recentActivity).toHaveLength(mockFills.length);
      expect(
        result.current.recentActivity.every((tx) => tx.type === 'trade'),
      ).toBe(true);
      expect(result.current.perpsMarkets).toEqual(mockMarkets);
      expect(result.current.watchlistMarkets).toEqual([
        mockMarkets[0],
        mockMarkets[1],
      ]);
    });

    it('applies default limits to data', () => {
      // Create more data than default limits
      const manyPositions = Array.from({ length: 10 }, (_, i) =>
        createMockPosition({ coin: `COIN${i}` }),
      );
      const manyOrders = Array.from({ length: 10 }, (_, i) =>
        createMockOrder({ symbol: `COIN${i}` }),
      );
      const manyFills = Array.from({ length: 20 }, (_, i) =>
        createMockOrderFill({ symbol: `COIN${i}` }),
      );

      mockUsePerpsLivePositions.mockReturnValue({
        positions: manyPositions,
        isInitialLoading: false,
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: manyOrders,
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: manyFills,
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      // Default limits from HOME_SCREEN_CONFIG
      expect(result.current.positions.length).toBeLessThanOrEqual(10);
      expect(result.current.orders.length).toBeLessThanOrEqual(10);
      expect(result.current.recentActivity.length).toBeLessThanOrEqual(3);
    });

    it('respects custom limits from parameters', () => {
      const manyPositions = Array.from({ length: 10 }, (_, i) =>
        createMockPosition({ coin: `COIN${i}` }),
      );

      mockUsePerpsLivePositions.mockReturnValue({
        positions: manyPositions,
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsHomeData({ positionsLimit: 3 }),
      );

      expect(result.current.positions).toHaveLength(3);
    });

    it('passes throttleMs to live data hooks', () => {
      renderHook(() => usePerpsHomeData());

      expect(mockUsePerpsLivePositions).toHaveBeenCalledWith(
        expect.objectContaining({ throttleMs: 1000 }),
      );
      expect(mockUsePerpsLiveOrders).toHaveBeenCalledWith(
        expect.objectContaining({ throttleMs: 1000 }),
      );
    });

    it('hides TP/SL orders from home screen', () => {
      renderHook(() => usePerpsHomeData());

      expect(mockUsePerpsLiveOrders).toHaveBeenCalledWith(
        expect.objectContaining({ hideTpSl: true }),
      );
    });

    it('fetches markets with skipInitialFetch false', () => {
      renderHook(() => usePerpsHomeData());

      expect(mockUsePerpsMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ skipInitialFetch: false }),
      );
    });
  });

  describe('Loading states', () => {
    it('returns loading state for positions', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.isLoading.positions).toBe(true);
    });

    it('returns loading state for markets', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.isLoading.markets).toBe(true);
    });

    it('returns false when all data is loaded', () => {
      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.isLoading.positions).toBe(false);
      expect(result.current.isLoading.markets).toBe(false);
    });
  });

  describe('Watchlist filtering', () => {
    it('filters markets by watchlist symbols', () => {
      // Mock selector to return only BTC in watchlist
      mockSelectPerpsWatchlistMarkets.mockReturnValue(['BTC']);

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.watchlistMarkets).toHaveLength(1);
      expect(result.current.watchlistMarkets[0].symbol).toBe('BTC');
    });

    it('returns empty array when watchlist is empty', () => {
      mockSelectPerpsWatchlistMarkets.mockReturnValue([]);

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.watchlistMarkets).toEqual([]);
    });

    it('returns all watchlist markets regardless of watchlistMarketsLimit', () => {
      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.watchlistMarkets).toHaveLength(2);
      expect(result.current.watchlistMarkets.map((m) => m.symbol)).toEqual([
        'BTC',
        'ETH',
      ]);
    });
  });

  describe('Trending markets sorting', () => {
    it('sorts markets using saved sort preference', () => {
      renderHook(() => usePerpsHomeData());

      expect(mockSortMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          markets: mockMarkets,
          sortBy: 'volume',
          direction: 'desc',
        }),
      );
    });

    it('applies trendingLimit to sorted markets', () => {
      const manyMarkets = Array.from({ length: 10 }, (_, i) =>
        createMockMarket({ symbol: `COIN${i}` }),
      );

      mockUsePerpsMarkets.mockReturnValue({
        markets: manyMarkets,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      mockSortMarkets.mockImplementation(({ markets }) => markets);

      const { result } = renderHook(() =>
        usePerpsHomeData({ trendingLimit: 3 }),
      );

      expect(result.current.perpsMarkets).toHaveLength(3);
    });

    it('uses default direction when sort option not found', () => {
      mockSelectPerpsMarketFilterPreferences.mockReturnValue(
        'unknown-sort-option' as never,
      );

      renderHook(() => usePerpsHomeData());

      expect(mockSortMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'desc',
        }),
      );
    });

    it('returns sort field from hook', () => {
      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.sortBy).toBe('volume' as SortField);
    });
  });

  describe('Search filtering', () => {
    it('filters positions by coin field', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'BTC' }),
      );

      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].coin).toBe('BTC');
    });

    it('filters orders by symbol field', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'SOL' }),
      );

      expect(result.current.orders).toHaveLength(1);
      expect(result.current.orders[0].symbol).toBe('SOL');
    });

    it('filters transactions by asset field', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'ETH' }),
      );

      expect(result.current.recentActivity).toHaveLength(1);
      expect(result.current.recentActivity[0].asset).toBe('ETH');
    });

    it('filters watchlist markets by symbol or name', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'Bit' }),
      );

      expect(result.current.watchlistMarkets).toHaveLength(1);
      expect(result.current.watchlistMarkets[0].symbol).toBe('BTC');
    });

    it('searches all markets when search query present', () => {
      const allMarkets = [
        ...mockMarkets,
        createMockMarket({ symbol: 'DOGE', name: 'Dogecoin' }),
      ];

      mockUsePerpsMarkets.mockReturnValue({
        markets: allMarkets,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'DOGE' }),
      );

      expect(result.current.perpsMarkets).toHaveLength(1);
      expect(result.current.perpsMarkets[0].symbol).toBe('DOGE');
    });

    it('shows top trending markets when search query is empty', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: '', trendingLimit: 2 }),
      );

      expect(result.current.perpsMarkets).toHaveLength(2);
    });

    it('performs case-insensitive search', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'btc' }),
      );

      expect(result.current.positions.length).toBeGreaterThan(0);
      expect(result.current.positions[0].coin).toBe('BTC');
    });

    it('trims whitespace from search query', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: '  BTC  ' }),
      );

      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].coin).toBe('BTC');
    });

    it('returns all data when search query is empty', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: '' }),
      );

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.orders).toEqual(mockOrders);
      // recentActivity now comes from WebSocket fills (transformed to transactions)
      expect(result.current.recentActivity).toHaveLength(mockFills.length);
    });

    it('returns all data when search query is only whitespace', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: '   ' }),
      );

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.orders).toEqual(mockOrders);
    });

    it('handles undefined fields gracefully', () => {
      const positionWithoutCoin = createMockPosition({ coin: undefined });
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [positionWithoutCoin],
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'BTC' }),
      );

      expect(result.current.positions).toEqual([]);
    });
  });

  describe('Refresh functionality', () => {
    it('calls refresh on markets', async () => {
      const { result } = renderHook(() => usePerpsHomeData());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockRefreshMarkets).toHaveBeenCalledTimes(1);
    });

    it('returns refresh function', () => {
      const { result } = renderHook(() => usePerpsHomeData());

      expect(typeof result.current.refresh).toBe('function');
    });

    it('handles refresh errors gracefully', async () => {
      mockRefreshMarkets.mockRejectedValue(new Error('Refresh failed'));

      const { result } = renderHook(() => usePerpsHomeData());

      await act(async () => {
        await expect(result.current.refresh()).rejects.toThrow(
          'Refresh failed',
        );
      });
    });

    it('does not refresh WebSocket data', async () => {
      const { result } = renderHook(() => usePerpsHomeData());

      const positionsBeforeRefresh = result.current.positions;

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.positions).toBe(positionsBeforeRefresh);
    });
  });

  describe('Edge cases', () => {
    it('handles empty positions array', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.positions).toEqual([]);
    });

    it('handles empty orders array', () => {
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.orders).toEqual([]);
    });

    it('handles empty fills array', () => {
      // Activity now comes from WebSocket fills, not usePerpsTransactionHistory
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.recentActivity).toEqual([]);
    });

    it('handles empty markets array', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.perpsMarkets).toEqual([]);
      expect(result.current.watchlistMarkets).toEqual([]);
    });

    it('handles all empty data sources', () => {
      mockUsePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: false,
      });
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: false,
      });
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });
      mockUsePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });
      mockUsePerpsTransactionHistory.mockReturnValue({
        transactions: [],
        isLoading: false,
        error: null,
        refetch: jest.fn().mockResolvedValue(undefined),
      });

      const { result } = renderHook(() => usePerpsHomeData());

      expect(result.current.positions).toEqual([]);
      expect(result.current.orders).toEqual([]);
      expect(result.current.recentActivity).toEqual([]);
      expect(result.current.perpsMarkets).toEqual([]);
      expect(result.current.watchlistMarkets).toEqual([]);
    });

    it('handles zero limits', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({
          positionsLimit: 0,
          ordersLimit: 0,
          trendingLimit: 0,
          activityLimit: 0,
        }),
      );

      expect(result.current.positions).toEqual([]);
      expect(result.current.orders).toEqual([]);
      expect(result.current.perpsMarkets).toEqual([]);
      expect(result.current.recentActivity).toEqual([]);
    });

    it('handles very large limits', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({
          positionsLimit: 1000,
          ordersLimit: 1000,
          trendingLimit: 1000,
          activityLimit: 1000,
        }),
      );

      expect(result.current.positions).toEqual(mockPositions);
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.perpsMarkets).toEqual(mockMarkets);
      // recentActivity now comes from WebSocket fills (transformed to transactions)
      expect(result.current.recentActivity).toHaveLength(mockFills.length);
    });

    it('handles special characters in search query', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: '$BTC*' }),
      );

      expect(result.current.positions).toEqual([]);
    });
  });

  describe('Data reactivity', () => {
    it('updates when positions change', () => {
      const { result, rerender } = renderHook(() => usePerpsHomeData());

      const initialPositions = result.current.positions;

      const newPositions = [createMockPosition({ coin: 'SOL' })];
      mockUsePerpsLivePositions.mockReturnValue({
        positions: newPositions,
        isInitialLoading: false,
      });

      rerender();

      expect(result.current.positions).not.toBe(initialPositions);
      expect(result.current.positions).toEqual(newPositions);
    });

    it('updates when orders change', () => {
      const { result, rerender } = renderHook(() => usePerpsHomeData());

      const newOrders = [createMockOrder({ symbol: 'DOGE' })];
      mockUsePerpsLiveOrders.mockReturnValue({
        orders: newOrders,
        isInitialLoading: false,
      });

      rerender();

      expect(result.current.orders).toEqual(newOrders);
    });

    it('updates when markets change', () => {
      const { result, rerender } = renderHook(() => usePerpsHomeData());

      const newMarkets = [createMockMarket({ symbol: 'AVAX' })];
      mockUsePerpsMarkets.mockReturnValue({
        markets: newMarkets,
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: mockRefreshMarkets,
      });

      rerender();

      expect(result.current.perpsMarkets).toEqual(newMarkets);
    });

    it('updates when watchlist changes', () => {
      const { result, rerender } = renderHook(() => usePerpsHomeData());

      expect(result.current.watchlistMarkets).toHaveLength(2);

      mockSelectPerpsWatchlistMarkets.mockReturnValue(['SOL']);

      rerender();

      expect(result.current.watchlistMarkets).toHaveLength(1);
      expect(result.current.watchlistMarkets[0].symbol).toBe('SOL');
    });

    it('updates when search query changes', () => {
      const { result, rerender } = renderHook(
        ({ searchQuery }) => usePerpsHomeData({ searchQuery }),
        { initialProps: { searchQuery: '' } },
      );

      expect(result.current.positions).toHaveLength(2);

      rerender({ searchQuery: 'BTC' });

      expect(result.current.positions).toHaveLength(1);
      expect(result.current.positions[0].coin).toBe('BTC');
    });
  });

  describe('Combined scenarios', () => {
    it('applies search and limits together', () => {
      const manyPositions = [
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'BTC' }),
        createMockPosition({ coin: 'ETH' }),
      ];

      mockUsePerpsLivePositions.mockReturnValue({
        positions: manyPositions,
        isInitialLoading: false,
      });

      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'BTC', positionsLimit: 2 }),
      );

      expect(result.current.positions).toHaveLength(2);
      expect(result.current.positions.every((p) => p.coin === 'BTC')).toBe(
        true,
      );
    });

    it('combines search with watchlist filtering', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({ searchQuery: 'BTC' }),
      );

      const watchlistSymbols = result.current.watchlistMarkets.map(
        (m) => m.symbol,
      );

      expect(watchlistSymbols).toContain('BTC');
      expect(watchlistSymbols).not.toContain('SOL');
    });

    it('handles all parameters together', () => {
      const { result } = renderHook(() =>
        usePerpsHomeData({
          positionsLimit: 1,
          ordersLimit: 1,
          trendingLimit: 1,
          activityLimit: 1,
          searchQuery: 'BTC',
        }),
      );

      expect(result.current.positions.length).toBeLessThanOrEqual(1);
      expect(result.current.orders.length).toBeLessThanOrEqual(1);
      expect(result.current.perpsMarkets.length).toBeLessThanOrEqual(1);
      expect(result.current.recentActivity.length).toBeLessThanOrEqual(1);
    });
  });
});
