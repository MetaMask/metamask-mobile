import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { usePerpsMarketListView } from './usePerpsMarketListView';
import { usePerpsMarkets } from './usePerpsMarkets';
import { usePerpsSearch } from './usePerpsSearch';
import { usePerpsSorting } from './usePerpsSorting';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsMarketData } from '../controllers/types';
import {
  sortMarkets,
  type SortField,
  type SortDirection,
} from '../utils/sortMarkets';
import Engine from '../../../../core/Engine';

// Mock sortMarkets utility
jest.mock('../utils/sortMarkets', () => ({
  sortMarkets: jest.fn(({ markets }) => markets),
}));

const mockSortMarkets = sortMarkets as jest.MockedFunction<typeof sortMarkets>;

// Mock dependencies
jest.mock('./usePerpsMarkets');
jest.mock('./usePerpsSearch');
jest.mock('./usePerpsSorting');
jest.mock('react-redux');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      saveMarketFilterPreferences: jest.fn(),
    },
  },
}));

const mockUsePerpsMarkets = usePerpsMarkets as jest.MockedFunction<
  typeof usePerpsMarkets
>;
const mockUsePerpsSearch = usePerpsSearch as jest.MockedFunction<
  typeof usePerpsSearch
>;
const mockUsePerpsSorting = usePerpsSorting as jest.MockedFunction<
  typeof usePerpsSorting
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Test data
const createMockMarket = (symbol: string, volume: string): PerpsMarketData => ({
  symbol,
  name: `${symbol} Token`,
  maxLeverage: '20x',
  price: '$1,000.00',
  change24h: '+2.5%',
  change24hPercent: '2.5',
  volume,
});

const mockMarketsWithValidVolume: PerpsMarketData[] = [
  createMockMarket('BTC', '$1.2B'),
  createMockMarket('ETH', '$900M'),
  createMockMarket('SOL', '$500M'),
];

const mockMarketsWithInvalidVolume: PerpsMarketData[] = [
  createMockMarket('ZERO1', PERPS_CONSTANTS.ZeroAmountDisplay),
  createMockMarket('ZERO2', PERPS_CONSTANTS.ZeroAmountDetailedDisplay),
  createMockMarket('FALLBACK1', PERPS_CONSTANTS.FallbackPriceDisplay),
  createMockMarket('FALLBACK2', PERPS_CONSTANTS.FallbackDataDisplay),
];

const mockAllMarkets = [
  ...mockMarketsWithValidVolume,
  ...mockMarketsWithInvalidVolume,
];

describe('usePerpsMarketListView', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset sortMarkets mock to pass through by default
    mockSortMarkets.mockImplementation(({ markets }) => markets);

    // Default mock implementations
    // Mock usePerpsMarkets to filter markets based on showZeroVolume parameter
    mockUsePerpsMarkets.mockImplementation(
      (options?: { showZeroVolume?: boolean }) => {
        const shouldFilter = !options?.showZeroVolume; // Default is false (filter out zero volume)
        const filteredMarkets = shouldFilter
          ? mockMarketsWithValidVolume
          : mockAllMarkets;

        return {
          markets: filteredMarkets as unknown as ReturnType<
            typeof usePerpsMarkets
          >['markets'],
          isLoading: false,
          isRefreshing: false,
          error: null,
          refresh: jest.fn(),
        };
      },
    );

    mockUsePerpsSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: jest.fn(),
      isSearchVisible: false,
      setIsSearchVisible: jest.fn(),
      toggleSearchVisibility: jest.fn(),
      filteredMarkets: mockMarketsWithValidVolume, // Already filtered by volume
      clearSearch: jest.fn(),
    });

    mockUsePerpsSorting.mockReturnValue({
      selectedOptionId: 'volume',
      sortBy: 'volume' as SortField,
      direction: 'desc' as SortDirection,
      handleOptionChange: jest.fn(),
      sortMarketsList: jest.fn((markets) => markets), // Pass through by default
    });

    // Mock Redux selectors - need to mock based on call order
    // First call is watchlistMarkets, second is sortPreference
    let selectorCallCount = 0;
    mockUseSelector.mockImplementation(() => {
      selectorCallCount++;
      if (selectorCallCount % 2 === 1) {
        // Odd calls are watchlist (first, third, fifth, etc.)
        return ['BTC', 'ETH'];
      }
      // Even calls are sort preference (second, fourth, sixth, etc.)
      return { optionId: 'volume', direction: 'desc' };
    });
  });

  describe('Initial State', () => {
    it('returns correct initial state with default parameters', () => {
      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.markets).toEqual(mockMarketsWithValidVolume);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchState).toBeDefined();
      expect(result.current.sortState).toBeDefined();
      expect(result.current.favoritesState).toBeDefined();
    });

    it('respects defaultSearchVisible parameter', () => {
      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: true,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: mockMarketsWithValidVolume,
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultSearchVisible: true }),
      );

      expect(result.current.searchState.isSearchVisible).toBe(true);
      expect(mockUsePerpsSearch).toHaveBeenCalledWith({
        markets: expect.any(Array),
        initialSearchVisible: true,
      });
    });

    it('respects showWatchlistOnly parameter', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ showWatchlistOnly: true }),
      );

      expect(result.current.favoritesState.showFavoritesOnly).toBe(true);
    });

    it('passes enablePolling to usePerpsMarkets', () => {
      renderHook(() => usePerpsMarketListView({ enablePolling: true }));

      expect(mockUsePerpsMarkets).toHaveBeenCalledWith({
        enablePolling: true,
        showZeroVolume: false,
      });
    });
  });

  describe('Volume Filtering', () => {
    it('passes showZeroVolume=false to usePerpsMarkets by default', () => {
      renderHook(() => usePerpsMarketListView());

      // Default behavior: hide zero volume markets
      expect(mockUsePerpsMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          showZeroVolume: false,
        }),
      );
    });

    it('passes showZeroVolume=true when showZeroVolume=true', () => {
      renderHook(() => usePerpsMarketListView({ showZeroVolume: true }));

      // When showZeroVolume is true, show them
      expect(mockUsePerpsMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          showZeroVolume: true,
        }),
      );
    });

    it('filters out markets with zero volume displays', () => {
      renderHook(() => usePerpsMarketListView());

      // Should only pass markets with valid volume to usePerpsSearch
      // (usePerpsMarkets mock filters them based on showZeroVolume parameter)
      expect(mockUsePerpsSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          markets: expect.not.arrayContaining([
            expect.objectContaining({
              volume: PERPS_CONSTANTS.ZeroAmountDisplay,
            }),
          ]),
        }),
      );
    });

    it('filters out markets with fallback displays', () => {
      renderHook(() => usePerpsMarketListView());

      // Should only pass markets with valid volume to usePerpsSearch
      expect(mockUsePerpsSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          markets: expect.not.arrayContaining([
            expect.objectContaining({
              volume: PERPS_CONSTANTS.FallbackPriceDisplay,
            }),
          ]),
        }),
      );
    });

    it('keeps markets with valid volume', () => {
      renderHook(() => usePerpsMarketListView());

      // Check that valid markets are passed through
      const marketsPassedToSearch = (mockUsePerpsSearch as jest.Mock).mock
        .calls[0][0].markets;
      expect(marketsPassedToSearch).toHaveLength(
        mockMarketsWithValidVolume.length,
      );
      expect(marketsPassedToSearch).toEqual(
        expect.arrayContaining(mockMarketsWithValidVolume),
      );
    });

    it('handles empty markets array', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [] as unknown as ReturnType<typeof usePerpsMarkets>['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [],
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.markets).toEqual([]);
    });
  });

  describe('Search Integration', () => {
    it('exposes search state correctly', () => {
      const mockSearchState = {
        searchQuery: 'BTC',
        setSearchQuery: jest.fn(),
        isSearchVisible: true,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [mockMarketsWithValidVolume[0]],
        clearSearch: jest.fn(),
      };

      mockUsePerpsSearch.mockReturnValue(mockSearchState);

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.searchState.searchQuery).toBe('BTC');
      expect(result.current.searchState.isSearchVisible).toBe(true);
      expect(result.current.searchState.setSearchQuery).toBe(
        mockSearchState.setSearchQuery,
      );
      expect(result.current.searchState.toggleSearchVisibility).toBe(
        mockSearchState.toggleSearchVisibility,
      );
      expect(result.current.searchState.clearSearch).toBe(
        mockSearchState.clearSearch,
      );
    });
  });

  describe('Sort Integration', () => {
    it('uses saved sort preference from Redux', () => {
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 2 === 1) {
          // Odd calls are watchlist
          return ['BTC'];
        }
        // Even calls are sort preference
        return { optionId: 'priceChange', direction: 'asc' };
      });

      renderHook(() => usePerpsMarketListView());

      expect(mockUsePerpsSorting).toHaveBeenCalledWith({
        initialOptionId: 'priceChange',
        initialDirection: 'asc',
      });
    });

    it('exposes sort state correctly', () => {
      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.sortState.selectedOptionId).toBe('volume');
      expect(result.current.sortState.sortBy).toBe('volume');
      expect(result.current.sortState.direction).toBe('desc');
      expect(typeof result.current.sortState.handleOptionChange).toBe(
        'function',
      );
    });

    it('saves sort preference to PerpsController when changed', () => {
      const { result } = renderHook(() => usePerpsMarketListView());

      // Call handleOptionChange with 'asc' direction
      result.current.sortState.handleOptionChange(
        'priceChange',
        'priceChange' as SortField,
        'asc' as SortDirection,
      );

      // Should have called Engine's saveMarketFilterPreferences with both optionId and direction
      expect(
        Engine.context.PerpsController.saveMarketFilterPreferences,
      ).toHaveBeenCalledWith('priceChange', 'asc');
    });

    it('applies sorting to filtered markets', () => {
      const mockSortedMarkets = [
        mockMarketsWithValidVolume[2],
        mockMarketsWithValidVolume[1],
        mockMarketsWithValidVolume[0],
      ];

      // Mock sortMarkets utility to return sorted markets
      mockSortMarkets.mockReturnValue(mockSortedMarkets);

      mockUsePerpsSorting.mockReturnValue({
        selectedOptionId: 'volume',
        sortBy: 'volume' as SortField,
        direction: 'asc' as SortDirection,
        handleOptionChange: jest.fn(),
        sortMarketsList: jest.fn((markets) => markets),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(mockSortMarkets).toHaveBeenCalled();
      expect(result.current.markets).toEqual(mockSortedMarkets);
    });
  });

  describe('Favorites Filtering', () => {
    it('filters by watchlist when showFavoritesOnly is true', () => {
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 2 === 1) {
          return ['BTC', 'ETH'];
        }
        return { optionId: 'volume', direction: 'desc' };
      });

      const { result } = renderHook(() =>
        usePerpsMarketListView({ showWatchlistOnly: true }),
      );

      // Only BTC and ETH should be in the result
      const symbols = result.current.markets.map((m) => m.symbol);
      expect(symbols).toEqual(expect.arrayContaining(['BTC', 'ETH']));
      expect(symbols).not.toContain('SOL');
    });

    it('shows all markets when showFavoritesOnly is false', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ showWatchlistOnly: false }),
      );

      expect(result.current.markets).toEqual(mockMarketsWithValidVolume);
    });

    it('exposes favorites state correctly', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ showWatchlistOnly: true }),
      );

      expect(result.current.favoritesState.showFavoritesOnly).toBe(true);
      expect(typeof result.current.favoritesState.setShowFavoritesOnly).toBe(
        'function',
      );
    });

    it('updates when favorites filter changes', () => {
      const { result, rerender } = renderHook(
        ({ showWatchlistOnly }) =>
          usePerpsMarketListView({ showWatchlistOnly }),
        {
          initialProps: { showWatchlistOnly: false },
        },
      );

      // Initially all markets
      expect(result.current.markets).toEqual(mockMarketsWithValidVolume);

      // Change to show favorites only
      rerender({ showWatchlistOnly: true });

      // Now only watchlisted markets
      const symbols = result.current.markets.map((m) => m.symbol);
      expect(symbols).toEqual(expect.arrayContaining(['BTC', 'ETH']));
    });
  });

  describe('Combined Filtering', () => {
    it('applies filters in correct order: volume → search → favorites → sort', () => {
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 2 === 1) {
          return ['BTC', 'ETH'];
        }
        return { optionId: 'volume', direction: 'desc' };
      });

      // Mock search to return only BTC
      mockUsePerpsSearch.mockReturnValue({
        searchQuery: 'BTC',
        setSearchQuery: jest.fn(),
        isSearchVisible: true,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [mockMarketsWithValidVolume[0]], // Only BTC
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsMarketListView({ showWatchlistOnly: true }),
      );

      // Should only have BTC (searched AND in watchlist)
      expect(result.current.markets).toHaveLength(1);
      expect(result.current.markets[0].symbol).toBe('BTC');
    });

    it('handles all filters active simultaneously', () => {
      let selectorCallCount = 0;
      mockUseSelector.mockImplementation(() => {
        selectorCallCount++;
        if (selectorCallCount % 2 === 1) {
          return ['ETH'];
        }
        return { optionId: 'volume', direction: 'desc' };
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: 'ETH',
        setSearchQuery: jest.fn(),
        isSearchVisible: true,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [mockMarketsWithValidVolume[1]], // Only ETH
        clearSearch: jest.fn(),
      });

      // Mock sortMarkets utility to pass through (sorting applied)
      mockSortMarkets.mockImplementation(({ markets }) => markets);

      mockUsePerpsSorting.mockReturnValue({
        selectedOptionId: 'priceChange',
        sortBy: 'priceChange' as SortField,
        direction: 'asc' as SortDirection,
        handleOptionChange: jest.fn(),
        sortMarketsList: jest.fn((markets) => markets),
      });

      const { result } = renderHook(() =>
        usePerpsMarketListView({
          showWatchlistOnly: true,
          defaultSearchVisible: true,
        }),
      );

      // All filters applied
      expect(result.current.markets).toHaveLength(1);
      expect(result.current.markets[0].symbol).toBe('ETH');
      expect(mockSortMarkets).toHaveBeenCalled();
    });
  });

  describe('Loading & Error States', () => {
    it('exposes loading state from usePerpsMarkets', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [] as unknown as ReturnType<typeof usePerpsMarkets>['markets'],
        isLoading: true,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.isLoading).toBe(true);
    });

    it('exposes error state from usePerpsMarkets', () => {
      const mockError = 'Failed to fetch markets';
      mockUsePerpsMarkets.mockReturnValue({
        markets: [] as unknown as ReturnType<typeof usePerpsMarkets>['markets'],
        isLoading: false,
        isRefreshing: false,
        error: mockError,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.error).toBe(mockError);
    });

    it('handles loading state changes', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [] as unknown as ReturnType<typeof usePerpsMarkets>['markets'],
        isLoading: true,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePerpsMarketListView());

      expect(result.current.isLoading).toBe(true);

      // Update to loaded state
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockAllMarkets as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      rerender();

      expect(result.current.isLoading).toBe(false);
      expect(result.current.markets.length).toBeGreaterThan(0);
    });
  });

  describe('Market Counts', () => {
    it('returns correct counts for crypto-only markets', () => {
      // All markets without marketType are crypto
      mockUsePerpsMarkets.mockReturnValue({
        markets: mockMarketsWithValidVolume as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.marketCounts).toEqual({
        crypto: 3,
        equity: 0,
        commodity: 0,
        forex: 0,
      });
    });

    it('returns correct counts for mixed market types', () => {
      const mixedMarkets = [
        { ...createMockMarket('BTC', '$1B') }, // crypto (no marketType)
        { ...createMockMarket('ETH', '$500M') }, // crypto (no marketType)
        { ...createMockMarket('AAPL', '$2B'), marketType: 'equity' as const },
        {
          ...createMockMarket('GOOGL', '$1.5B'),
          marketType: 'equity' as const,
        },
        {
          ...createMockMarket('GOLD', '$800M'),
          marketType: 'commodity' as const,
        },
        { ...createMockMarket('EURUSD', '$3B'), marketType: 'forex' as const },
      ];

      mockUsePerpsMarkets.mockReturnValue({
        markets: mixedMarkets as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: mixedMarkets,
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.marketCounts).toEqual({
        crypto: 2,
        equity: 2,
        commodity: 1,
        forex: 1,
      });
    });

    it('returns zero counts for empty markets', () => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: [] as unknown as ReturnType<typeof usePerpsMarkets>['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [],
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() => usePerpsMarketListView());

      expect(result.current.marketCounts).toEqual({
        crypto: 0,
        equity: 0,
        commodity: 0,
        forex: 0,
      });
    });

    it('updates counts when markets change', () => {
      const initialMarkets = [createMockMarket('BTC', '$1B')];
      const updatedMarkets = [
        ...initialMarkets,
        { ...createMockMarket('AAPL', '$2B'), marketType: 'equity' as const },
      ];

      mockUsePerpsMarkets.mockReturnValue({
        markets: initialMarkets as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: initialMarkets,
        clearSearch: jest.fn(),
      });

      const { result, rerender } = renderHook(() => usePerpsMarketListView());

      expect(result.current.marketCounts.crypto).toBe(1);
      expect(result.current.marketCounts.equity).toBe(0);

      // Update markets
      mockUsePerpsMarkets.mockReturnValue({
        markets: updatedMarkets as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: updatedMarkets,
        clearSearch: jest.fn(),
      });

      rerender();

      expect(result.current.marketCounts.crypto).toBe(1);
      expect(result.current.marketCounts.equity).toBe(1);
    });
  });

  describe('Market Type Category Filtering', () => {
    const mixedMarkets = [
      { ...createMockMarket('BTC', '$1B') }, // crypto (no marketType)
      { ...createMockMarket('ETH', '$500M') }, // crypto (no marketType)
      { ...createMockMarket('AAPL', '$2B'), marketType: 'equity' as const },
      {
        ...createMockMarket('GOOGL', '$1.5B'),
        marketType: 'equity' as const,
      },
      {
        ...createMockMarket('GOLD', '$800M'),
        marketType: 'commodity' as const,
      },
      { ...createMockMarket('EURUSD', '$3B'), marketType: 'forex' as const },
    ];

    beforeEach(() => {
      mockUsePerpsMarkets.mockReturnValue({
        markets: mixedMarkets as unknown as ReturnType<
          typeof usePerpsMarkets
        >['markets'],
        isLoading: false,
        isRefreshing: false,
        error: null,
        refresh: jest.fn(),
      });

      mockUsePerpsSearch.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        isSearchVisible: false,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: mixedMarkets,
        clearSearch: jest.fn(),
      });
    });

    it('shows all markets when filter is "all"', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'all' }),
      );

      expect(result.current.markets.length).toBe(6);
    });

    it('filters to crypto markets when filter is "crypto"', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'crypto' }),
      );

      // Should only include markets without marketType (crypto)
      expect(result.current.markets.length).toBe(2);
      expect(result.current.markets.every((m) => !m.marketType)).toBe(true);
    });

    it('filters to stocks (equity) when filter is "stocks"', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'stocks' }),
      );

      // Should only include equity markets
      expect(result.current.markets.length).toBe(2);
      expect(
        result.current.markets.every((m) => m.marketType === 'equity'),
      ).toBe(true);
    });

    it('filters to commodities when filter is "commodities"', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'commodities' }),
      );

      // Should only include commodity markets
      expect(result.current.markets.length).toBe(1);
      expect(
        result.current.markets.every((m) => m.marketType === 'commodity'),
      ).toBe(true);
    });

    it('filters to forex when filter is "forex"', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'forex' }),
      );

      // Should only include forex markets
      expect(result.current.markets.length).toBe(1);
      expect(
        result.current.markets.every((m) => m.marketType === 'forex'),
      ).toBe(true);
    });

    it('ignores category filter when searching', () => {
      mockUsePerpsSearch.mockReturnValue({
        searchQuery: 'BTC',
        setSearchQuery: jest.fn(),
        isSearchVisible: true,
        setIsSearchVisible: jest.fn(),
        toggleSearchVisibility: jest.fn(),
        filteredMarkets: [mixedMarkets[0]], // Only BTC from search
        clearSearch: jest.fn(),
      });

      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'forex' }),
      );

      // When searching, should show search results regardless of category filter
      expect(result.current.markets.length).toBe(1);
      expect(result.current.markets[0].symbol).toBe('BTC');
    });

    it('exposes market type filter state', () => {
      const { result } = renderHook(() =>
        usePerpsMarketListView({ defaultMarketTypeFilter: 'stocks' }),
      );

      expect(result.current.marketTypeFilterState.marketTypeFilter).toBe(
        'stocks',
      );
      expect(
        typeof result.current.marketTypeFilterState.setMarketTypeFilter,
      ).toBe('function');
    });
  });
});
