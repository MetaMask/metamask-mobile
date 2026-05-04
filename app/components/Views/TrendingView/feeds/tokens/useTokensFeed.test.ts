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
});
