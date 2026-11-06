import { useTrendingSearch } from './useTrendingSearch';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';

// Mock dependencies
jest.mock('../useSearchRequest/useSearchRequest');
jest.mock('../useTrendingRequest/useTrendingRequest');
jest.mock('../../utils/sortTrendingTokens');

const mockUseSearchRequest = useSearchRequest as jest.MockedFunction<
  typeof useSearchRequest
>;
const mockUseTrendingRequest = useTrendingRequest as jest.MockedFunction<
  typeof useTrendingRequest
>;
const mockSortTrendingTokens = sortTrendingTokens as jest.MockedFunction<
  typeof sortTrendingTokens
>;

describe('useTrendingSearch', () => {
  const mockTrendingResults: TrendingAsset[] = [
    {
      assetId: 'eip155:1/erc20:0x123',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      price: '2000',
      aggregatedUsdVolume: 1000000,
      marketCap: 500000000,
    },
    {
      assetId: 'eip155:1/erc20:0x456',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      price: '1',
      aggregatedUsdVolume: 500000,
      marketCap: 100000000,
    },
  ];

  const mockSearchResults = [
    {
      assetId: 'eip155:1/erc20:0x789' as CaipChainId,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      price: '1',
      aggregatedUsdVolume: 800000,
      marketCap: 300000000,
      pricePercentChange1d: '1',
    },
  ];

  const mockFetchTrendingTokens = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockUseSearchRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      search: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    });

    mockUseTrendingRequest.mockReturnValue({
      results: mockTrendingResults,
      isLoading: false,
      error: null,
      fetch: mockFetchTrendingTokens,
    });

    mockSortTrendingTokens.mockImplementation((tokens) => tokens);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns sorted trending results when no search query provided', async () => {
    const sortedResults = [mockTrendingResults[1], mockTrendingResults[0]];
    mockSortTrendingTokens.mockReturnValue(sortedResults);

    const { result } = renderHookWithProvider(() => useTrendingSearch());

    await waitFor(() => {
      expect(result.current.data).toEqual(sortedResults);
    });

    expect(mockSortTrendingTokens).toHaveBeenCalledWith(
      mockTrendingResults,
      PriceChangeOption.PriceChange,
      SortDirection.Descending,
      undefined,
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('passes custom sortTrendingTokensOptions to sortTrendingTokens', async () => {
    const sortedResults = [mockTrendingResults[1], mockTrendingResults[0]];
    mockSortTrendingTokens.mockReturnValue(sortedResults);

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.MarketCap,
          direction: SortDirection.Ascending,
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(sortedResults);
    });

    expect(mockSortTrendingTokens).toHaveBeenCalledWith(
      mockTrendingResults,
      PriceChangeOption.MarketCap,
      SortDirection.Ascending,
      undefined,
    );
  });

  it('passes custom time option to sortTrendingTokens', async () => {
    const sortedResults = [mockTrendingResults[1], mockTrendingResults[0]];
    mockSortTrendingTokens.mockReturnValue(sortedResults);

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.PriceChange,
          direction: SortDirection.Descending,
          timeOption: TimeOption.OneHour,
        },
      }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(sortedResults);
    });

    expect(mockSortTrendingTokens).toHaveBeenCalledWith(
      mockTrendingResults,
      PriceChangeOption.PriceChange,
      SortDirection.Descending,
      TimeOption.OneHour,
    );
  });

  it('returns search results in API order without merging trending matches', async () => {
    // Search for 'ETH' which matches a trending result, but the API search
    // response owns the order and contents — trending matches are neither
    // merged in nor appended.
    mockUseSearchRequest.mockReturnValue({
      results: mockSearchResults,
      isLoading: false,
      error: null,
      search: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({ searchQuery: 'ETH', sortBy: 'h24_trending' }),
    );

    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(result.current.data.map((item) => item.symbol)).toEqual(['USDC']);
  });

  it('returns the API result object for a duplicate assetId without swapping in the trending copy', async () => {
    const duplicateOfTrending = {
      assetId: mockTrendingResults[0].assetId as CaipChainId,
      symbol: mockTrendingResults[0].symbol,
      name: mockTrendingResults[0].name,
      decimals: mockTrendingResults[0].decimals,
      price: mockTrendingResults[0].price,
      aggregatedUsdVolume: mockTrendingResults[0].aggregatedUsdVolume,
      marketCap: mockTrendingResults[0].marketCap,
      pricePercentChange1d: '0',
    };
    mockUseSearchRequest.mockReturnValue({
      results: [duplicateOfTrending, mockSearchResults[0]],
      isLoading: false,
      error: null,
      search: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({ searchQuery: 'ETH', sortBy: 'h24_trending' }),
    );

    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    // The API's own result objects pass through in API order; the trending
    // list's copy is not swapped in for duplicate assetIds.
    expect(result.current.data.map((item) => item.assetId)).toEqual([
      'eip155:1/erc20:0x123',
      'eip155:1/erc20:0x789',
    ]);
    expect(result.current.data[0]).toEqual(
      expect.objectContaining({ symbol: 'ETH', priceChangePct: { h24: '0' } }),
    );
  });

  it.each([
    ['laptop', 'Laptop'],
    ['$laptop', '$Laptop'],
  ])(
    'returns API order for "%s" without appending trending matches',
    async (searchQuery, trendingName) => {
      const trendingLaptop = {
        ...mockTrendingResults[0],
        symbol: 'LAPTOP',
        name: trendingName,
      };
      const apiRankedFirst = {
        assetId: 'eip155:8453/erc20:0xabc' as CaipChainId,
        symbol: 'LAPTOP',
        name: 'Laptop Official',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 0,
        pricePercentChange1d: '0',
      };
      mockUseTrendingRequest.mockReturnValue({
        results: [trendingLaptop],
        isLoading: false,
        error: null,
        fetch: mockFetchTrendingTokens,
      });
      mockUseSearchRequest.mockReturnValue({
        results: [apiRankedFirst],
        isLoading: false,
        error: null,
        search: jest.fn(),
        loadMore: jest.fn(),
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: undefined,
      });

      const { result } = renderHookWithProvider(() =>
        useTrendingSearch({ searchQuery, sortBy: 'h24_trending' }),
      );

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
      });

      expect(result.current.data.map((item) => item.assetId)).toEqual([
        'eip155:8453/erc20:0xabc',
      ]);
      expect(mockUseSearchRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: searchQuery.replace(/^\$/, ''),
        }),
      );
    },
  );

  it('returns trending loading state when no search query', () => {
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: true,
      error: null,
      fetch: mockFetchTrendingTokens,
    });

    const { result } = renderHookWithProvider(() => useTrendingSearch());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns search loading state when search query provided', () => {
    mockUseSearchRequest.mockReturnValue({
      results: [],
      isLoading: true,
      error: null,
      search: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({ searchQuery: 'ETH', sortBy: 'h24_trending' }),
    );

    jest.advanceTimersByTime(200);

    expect(result.current.isLoading).toBe(true);
  });

  describe('filtering trending results by query', () => {
    it('returns all trending results when query is empty or whitespace', async () => {
      const sortedResults = mockTrendingResults;
      mockSortTrendingTokens.mockReturnValue(sortedResults);

      const { result: result1 } = renderHookWithProvider(() =>
        useTrendingSearch({ searchQuery: '' }),
      );
      const { result: result2 } = renderHookWithProvider(() =>
        useTrendingSearch({ searchQuery: '   ' }),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(sortedResults);
        expect(result2.current.data).toEqual(sortedResults);
      });
    });
  });

  describe('includeStocks option', () => {
    const mockSearchResultsWithRwa = [
      ...mockSearchResults,
      {
        assetId: 'eip155:1/erc20:0xrwa' as CaipChainId,
        symbol: 'AAPL',
        name: 'Apple Stock',
        decimals: 18,
        price: '150',
        aggregatedUsdVolume: 200000,
        marketCap: 2000000000,
        pricePercentChange1d: '0.5',
        rwaData: { instrumentType: 'equity' },
      },
    ];

    it('filters out items with rwaData by default (includeStocks: false)', async () => {
      mockUseSearchRequest.mockReturnValue({
        results: mockSearchResultsWithRwa,
        isLoading: false,
        error: null,
        search: jest.fn(),
        loadMore: jest.fn(),
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: undefined,
      });

      const { result } = renderHookWithProvider(() =>
        useTrendingSearch({ searchQuery: 'USDC' }),
      );

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(result.current.data).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ symbol: 'AAPL' })]),
        );
        expect(result.current.data).toEqual(
          expect.arrayContaining([expect.objectContaining({ symbol: 'USDC' })]),
        );
      });
    });

    it('includes items with rwaData when includeStocks is true', async () => {
      mockUseSearchRequest.mockReturnValue({
        results: mockSearchResultsWithRwa,
        isLoading: false,
        error: null,
        search: jest.fn(),
        loadMore: jest.fn(),
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: undefined,
      });

      const { result } = renderHookWithProvider(() =>
        useTrendingSearch({ searchQuery: 'USDC', includeStocks: true }),
      );

      jest.advanceTimersByTime(200);

      await waitFor(() => {
        expect(result.current.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ symbol: 'USDC' }),
            expect.objectContaining({ symbol: 'AAPL' }),
          ]),
        );
      });
    });
  });

  it('uses search immediately when debounce disabled', async () => {
    mockUseSearchRequest.mockReturnValue({
      results: mockSearchResults,
      isLoading: false,
      error: null,
      search: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch({
        searchQuery: 'USDC',
        sortBy: 'h24_trending',
        chainIds: null,
        enableDebounce: false,
      }),
    );

    expect(mockUseSearchRequest).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'USDC' }),
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ symbol: 'USDC' })]),
      );
    });
  });
});
