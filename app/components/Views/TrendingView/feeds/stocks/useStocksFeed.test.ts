import { renderHook } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { useStocksFeed } from './useStocksFeed';

jest.mock('../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens', () => ({
  useRwaTokens: jest.fn(),
}));

const mockUseRwaTokens = jest.mocked(useRwaTokens);
const mockRefetch = jest.fn();
const mockLoadMore = jest.fn();

const makeAsset = (assetId: string, symbol: string): TrendingAsset =>
  ({
    assetId,
    symbol,
    name: symbol,
  }) as unknown as TrendingAsset;

const ETH_OUSG = makeAsset('eip155:1/erc20:0xaaa', 'OUSG');
const ETH_BUIDL = makeAsset('eip155:1/erc20:0xbbb', 'BUIDL');
const BNB_OUSG = makeAsset('eip155:56/erc20:0xccc', 'bOUSG');

const ALL_RWA_ASSETS = [ETH_OUSG, ETH_BUIDL, BNB_OUSG];

const arrangeRwaTokens = (assets = ALL_RWA_ASSETS) => {
  mockUseRwaTokens.mockReturnValue({
    data: assets,
    isLoading: false,
    isLoadingMore: false,
    hasNextPage: false,
    totalCount: assets.length,
    loadMore: mockLoadMore,
    refetch: mockRefetch,
  });
};

describe('useStocksFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeRwaTokens();
  });

  describe('no-query path (tab sections)', () => {
    it('filters to Ethereum-only assets', () => {
      const { result } = renderHook(() => useStocksFeed());
      const symbols = result.current.data.map((d) => d.symbol);
      expect(symbols).toEqual(['OUSG', 'BUIDL']);
      expect(symbols).not.toContain('bOUSG');
    });

    it('passes undefined searchQuery to useRwaTokens', () => {
      renderHook(() => useStocksFeed());
      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: undefined }),
      );
    });

    it('requests Ethereum only from the RWA API', () => {
      renderHook(() => useStocksFeed());

      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ chainIds: ['eip155:1'] }),
      );
    });

    it('passes pageSize to useRwaTokens when provided', () => {
      renderHook(() => useStocksFeed({ pageSize: 3 }));

      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 3 }),
      );
    });

    it('exposes pagination metadata for full-view pagination', () => {
      const { result } = renderHook(() => useStocksFeed());

      expect(result.current.loadMore).toBe(mockLoadMore);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.totalCount).toBe(ALL_RWA_ASSETS.length);
    });
  });

  describe('query path (omni-search)', () => {
    it('includes tokens from all RWA chains, not just Ethereum', () => {
      const { result } = renderHook(() => useStocksFeed({ query: 'OUSG' }));
      const symbols = result.current.data.map((d) => d.symbol);
      expect(symbols).toContain('OUSG');
      expect(symbols).toContain('bOUSG');
    });

    it('does not filter out BNB tokens when a query is present', () => {
      const { result } = renderHook(() => useStocksFeed({ query: 'token' }));
      expect(result.current.data).toHaveLength(ALL_RWA_ASSETS.length);
    });

    it('passes the query through to useRwaTokens as searchQuery', () => {
      renderHook(() => useStocksFeed({ query: ' OUSG ' }));
      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'OUSG' }),
      );
    });

    it('does not restrict chainIds when searching', () => {
      renderHook(() => useStocksFeed({ query: 'OUSG' }));

      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ chainIds: undefined }),
      );
    });

    it('treats a whitespace-only query the same as no query (Ethereum-only)', () => {
      const { result } = renderHook(() => useStocksFeed({ query: '   ' }));
      const symbols = result.current.data.map((d) => d.symbol);
      expect(symbols).toEqual(['OUSG', 'BUIDL']);
      expect(symbols).not.toContain('bOUSG');
      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          searchQuery: undefined,
          chainIds: ['eip155:1'],
        }),
      );
    });
  });

  describe('loading, refetch, and pagination passthrough', () => {
    it('forwards isLoading from useRwaTokens', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [],
        isLoading: true,
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: 0,
        loadMore: mockLoadMore,
        refetch: mockRefetch,
      });
      const { result } = renderHook(() => useStocksFeed());
      expect(result.current.isLoading).toBe(true);
    });

    it('forwards refetch from useRwaTokens', () => {
      const { result } = renderHook(() => useStocksFeed());
      expect(result.current.refetch).toBe(mockRefetch);
    });

    it('forwards pagination state from useRwaTokens when searching', () => {
      mockUseRwaTokens.mockReturnValue({
        data: ALL_RWA_ASSETS,
        isLoading: false,
        isLoadingMore: true,
        hasNextPage: true,
        totalCount: 10,
        loadMore: mockLoadMore,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useStocksFeed({ query: 'OUSG' }));

      expect(result.current.isLoadingMore).toBe(true);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.totalCount).toBe(10);
      expect(result.current.loadMore).toBe(mockLoadMore);
    });
  });
});
