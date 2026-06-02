import { renderHook } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useRwaTokens } from '../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens';
import { useStocksFeed } from './useStocksFeed';

jest.mock('../../../../UI/Trending/hooks/useRwaTokens/useRwaTokens', () => ({
  useRwaTokens: jest.fn(),
}));

const mockUseRwaTokens = jest.mocked(useRwaTokens);
const mockRefetch = jest.fn();

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
      renderHook(() => useStocksFeed({ query: 'OUSG' }));
      expect(mockUseRwaTokens).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'OUSG' }),
      );
    });

    it('treats a whitespace-only query the same as no query (Ethereum-only)', () => {
      const { result } = renderHook(() => useStocksFeed({ query: '   ' }));
      const symbols = result.current.data.map((d) => d.symbol);
      expect(symbols).toEqual(['OUSG', 'BUIDL']);
      expect(symbols).not.toContain('bOUSG');
    });
  });

  describe('loading and refetch passthrough', () => {
    it('forwards isLoading from useRwaTokens', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [],
        isLoading: true,
        refetch: mockRefetch,
      });
      const { result } = renderHook(() => useStocksFeed());
      expect(result.current.isLoading).toBe(true);
    });

    it('forwards refetch from useRwaTokens', () => {
      const { result } = renderHook(() => useStocksFeed());
      expect(result.current.refetch).toBe(mockRefetch);
    });
  });
});
