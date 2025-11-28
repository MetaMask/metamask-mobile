import { useTrendingSearch } from './useTrendingSearch';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { waitFor } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipChainId } from '@metamask/utils';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';

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

    // Default mock implementations
    mockUseSearchRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      search: jest.fn(),
    });

    mockUseTrendingRequest.mockReturnValue({
      results: mockTrendingResults,
      isLoading: false,
      error: null,
      fetch: mockFetchTrendingTokens,
    });

    mockSortTrendingTokens.mockImplementation((tokens) => tokens);
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
      expect.any(String),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('returns combined search and trending results when search query provided', async () => {
    // Search for 'ETH' which matches one trending result
    mockUseSearchRequest.mockReturnValue({
      results: mockSearchResults,
      isLoading: false,
      error: null,
      search: jest.fn(),
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch('ETH', 'h24_trending'),
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    // Should contain ETH from trending (matches query) and USDC from search
    expect(result.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'ETH' }),
        expect.objectContaining({ symbol: 'USDC' }),
      ]),
    );
  });

  it('removes duplicate results when combining search and trending', async () => {
    const duplicateResult = {
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
      results: [duplicateResult, mockSearchResults[0]],
      isLoading: false,
      error: null,
      search: jest.fn(),
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch('ETH', 'h24_trending'),
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    // Should have ETH (deduplicated) and USDC (from search)
    // DAI is filtered out because it doesn't match 'ETH' query
    const assetIds = result.current.data.map((item) => item.assetId);
    const uniqueAssetIds = new Set(assetIds);
    expect(assetIds.length).toBe(uniqueAssetIds.size);
    expect(result.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: 'ETH' }),
        expect.objectContaining({ symbol: 'USDC' }),
      ]),
    );
  });

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
    });

    const { result } = renderHookWithProvider(() =>
      useTrendingSearch('ETH', 'h24_trending'),
    );

    expect(result.current.isLoading).toBe(true);
  });

  describe('filtering trending results by query', () => {
    it('returns all trending results when query is empty or whitespace', async () => {
      const sortedResults = mockTrendingResults;
      mockSortTrendingTokens.mockReturnValue(sortedResults);

      const { result: result1 } = renderHookWithProvider(() =>
        useTrendingSearch(''),
      );
      const { result: result2 } = renderHookWithProvider(() =>
        useTrendingSearch('   '),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(sortedResults);
        expect(result2.current.data).toEqual(sortedResults);
      });
    });

    it('filters trending results by symbol case-insensitively', async () => {
      const { result } = renderHookWithProvider(() => useTrendingSearch('eth'));

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].symbol).toBe('ETH');
      });
    });

    it('filters trending results by name case-insensitively', async () => {
      const { result } = renderHookWithProvider(() =>
        useTrendingSearch('ethereum'),
      );

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].name).toBe('Ethereum');
      });
    });

    it('filters trending results by partial matches', async () => {
      const { result } = renderHookWithProvider(() => useTrendingSearch('dai'));

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].symbol).toBe('DAI');
      });
    });

    it('returns empty array when no trending results match query', async () => {
      const { result } = renderHookWithProvider(() =>
        useTrendingSearch('NonExistent'),
      );

      await waitFor(() => {
        expect(result.current.data).toHaveLength(0);
      });
    });

    it('trims whitespace from query before filtering', async () => {
      const { result } = renderHookWithProvider(() =>
        useTrendingSearch('  ETH  '),
      );

      await waitFor(() => {
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].symbol).toBe('ETH');
      });
    });
  });
});
