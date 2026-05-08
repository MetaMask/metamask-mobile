import { renderHook, waitFor } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { useTokensFeed } from './useTokensFeed';

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({
    useTrendingSearch: jest.fn(),
  }),
);

const mockUseTrendingSearch = jest.mocked(useTrendingSearch);

describe('useTokensFeed', () => {
  const mockRefetch = jest.fn().mockResolvedValue(undefined);

  const sampleTokens = [
    {
      assetId: 'eip155:1/erc20:0xaaa',
      symbol: 'AAA',
      name: 'Alpha Token',
      marketCap: 100,
    },
    {
      assetId: 'eip155:1/erc20:0xbtc',
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      marketCap: 900,
    },
    {
      assetId: 'eip155:1/erc20:0xeth',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      marketCap: 500,
    },
  ] as unknown as TrendingAsset[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrendingSearch.mockReturnValue({
      data: sampleTokens,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  it('returns underlying data unchanged when query is empty', () => {
    const { result } = renderHook(() => useTokensFeed({ query: undefined }));

    expect(result.current.data).toEqual(sampleTokens);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('filters by query and sorts matches by market cap descending', () => {
    const { result } = renderHook(() => useTokensFeed({ query: 'wrap' }));

    expect(result.current.data.map((t) => t.symbol)).toEqual(['WBTC', 'WETH']);
  });

  it('refetches when refresh trigger increments past initial mount', async () => {
    const refresh: RefreshConfig = { trigger: 0, silentRefresh: false };
    const { rerender } = renderHook(
      ({ r }: { r: RefreshConfig }) => useTokensFeed({ refresh: r }),
      { initialProps: { r: refresh } },
    );

    expect(mockRefetch).not.toHaveBeenCalled();

    rerender({ r: { trigger: 1, silentRefresh: false } });

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  it('passes searchQuery from query option into useTrendingSearch', () => {
    renderHook(() => useTokensFeed({ query: 'sol' }));

    expect(mockUseTrendingSearch).toHaveBeenCalledWith({
      searchQuery: 'sol',
      enableDebounce: false,
    });
  });

  describe('hideRiskyTokens', () => {
    const tokensWithSecurity = [
      {
        assetId: 'eip155:1/erc20:0x1',
        symbol: 'VER',
        name: 'Verified Token',
        marketCap: 900,
        securityData: { resultType: 'Verified' },
      },
      {
        assetId: 'eip155:1/erc20:0x2',
        symbol: 'BEN',
        name: 'Benign Token',
        marketCap: 800,
        securityData: { resultType: 'Benign' },
      },
      {
        assetId: 'eip155:1/erc20:0x3',
        symbol: 'WRN',
        name: 'Warning Token',
        marketCap: 700,
        securityData: { resultType: 'Warning' },
      },
      {
        assetId: 'eip155:1/erc20:0x4',
        symbol: 'SPM',
        name: 'Spam Token',
        marketCap: 600,
        securityData: { resultType: 'Spam' },
      },
      {
        assetId: 'eip155:1/erc20:0x5',
        symbol: 'MAL',
        name: 'Malicious Token',
        marketCap: 500,
        securityData: { resultType: 'Malicious' },
      },
      {
        assetId: 'eip155:1/erc20:0x6',
        symbol: 'UNS',
        name: 'Unscanned Token',
        marketCap: 400,
      },
    ] as unknown as TrendingAsset[];

    beforeEach(() => {
      mockUseTrendingSearch.mockReturnValue({
        data: tokensWithSecurity,
        isLoading: false,
        refetch: mockRefetch,
      });
    });

    it('returns all tokens when hideRiskyTokens is false (default)', () => {
      const { result } = renderHook(() => useTokensFeed());

      expect(result.current.data.map((t) => t.symbol)).toEqual([
        'VER',
        'BEN',
        'WRN',
        'SPM',
        'MAL',
        'UNS',
      ]);
    });

    it('keeps only Verified, Benign, and unscanned tokens when hideRiskyTokens is true', () => {
      const { result } = renderHook(() =>
        useTokensFeed({ hideRiskyTokens: true }),
      );

      expect(result.current.data.map((t) => t.symbol)).toEqual([
        'VER',
        'BEN',
        'UNS',
      ]);
    });

    it('removes Warning tokens', () => {
      mockUseTrendingSearch.mockReturnValue({
        data: [tokensWithSecurity[2]],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() =>
        useTokensFeed({ hideRiskyTokens: true }),
      );

      expect(result.current.data).toHaveLength(0);
    });

    it('removes Spam tokens', () => {
      mockUseTrendingSearch.mockReturnValue({
        data: [tokensWithSecurity[3]],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() =>
        useTokensFeed({ hideRiskyTokens: true }),
      );

      expect(result.current.data).toHaveLength(0);
    });

    it('removes Malicious tokens', () => {
      mockUseTrendingSearch.mockReturnValue({
        data: [tokensWithSecurity[4]],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() =>
        useTokensFeed({ hideRiskyTokens: true }),
      );

      expect(result.current.data).toHaveLength(0);
    });
  });
});
