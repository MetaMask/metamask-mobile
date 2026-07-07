import { useRwaTokens } from './useRwaTokens';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { fetchRwas } from '@metamask/assets-controllers';
import {
  PriceChangeOption,
  SortDirection,
} from '../../components/TrendingTokensBottomSheet';
import { RWA_CHAIN_IDS } from '../../utils/trendingNetworksList';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import { act, waitFor } from '@testing-library/react-native';

jest.mock('@metamask/assets-controllers', () => ({
  fetchRwas: jest.fn(),
}));

const mockFetchRwas = jest.mocked(fetchRwas);
type RwaToken = Awaited<ReturnType<typeof fetchRwas>>['data'][number];

const createRwaToken = (overrides: Partial<RwaToken> = {}): RwaToken => ({
  id: '1',
  assetId: 'eip155:1/erc20:0xaaa' as CaipAssetType,
  symbol: 'OUSG',
  name: 'OUSG Token',
  decimals: 18,
  rwaData: {
    price: '100.50',
    priceChange: '1.5',
    aggregatedUsdVolume: 500000,
    marketCap: 1000000000,
    active: true,
    ticker: 'OUSG',
    instrumentType: 'fund',
    custodians: ['ondo'],
    industry: ['finance'],
  },
  ...overrides,
});

const createRwasResponse = (
  tokens: RwaToken[] = [createRwaToken()],
  pageInfo: { nextCursor: string | null; hasNextPage: boolean } = {
    nextCursor: null,
    hasNextPage: false,
  },
  totalCount = tokens.length,
) => ({
  data: tokens,
  count: tokens.length,
  totalCount,
  pageInfo,
});

const arrangeMocks = (options?: {
  tokens?: RwaToken[];
  rejectWith?: Error;
  hasNextPage?: boolean;
  nextCursor?: string;
}) => {
  if (options?.rejectWith) {
    mockFetchRwas.mockRejectedValue(options.rejectWith);
  } else {
    mockFetchRwas.mockResolvedValue(
      createRwasResponse(options?.tokens ?? [createRwaToken()], {
        nextCursor: options?.nextCursor ?? null,
        hasNextPage: options?.hasNextPage ?? false,
      }),
    );
  }
};

describe('useRwaTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeMocks();
  });

  it('calls fetchRwas with default params', async () => {
    renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith({
        chainIds: RWA_CHAIN_IDS,
        query: undefined,
        sortBy: 'price_change_desc',
        limit: 100,
      });
    });
  });

  it('uses provided chainIds instead of defaults', async () => {
    const customChainIds: CaipChainId[] = ['eip155:137' as CaipChainId];

    renderHookWithProvider(() => useRwaTokens({ chainIds: customChainIds }));

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ chainIds: customChainIds }),
      );
    });
  });

  it('uses provided pageSize as request limit', async () => {
    renderHookWithProvider(() => useRwaTokens({ pageSize: 3 }));

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 3 }),
      );
    });
  });

  it('defaults to RWA_CHAIN_IDS when chainIds is null', async () => {
    renderHookWithProvider(() => useRwaTokens({ chainIds: null }));

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ chainIds: RWA_CHAIN_IDS }),
      );
    });
  });

  it('normalizes rwaData.priceChange to priceChangePct.h24', async () => {
    arrangeMocks({
      tokens: [
        createRwaToken({
          rwaData: { ...createRwaToken().rwaData, priceChange: '3.14' },
        }),
      ],
    });

    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].priceChangePct).toEqual({ h24: '3.14' });
  });

  it('normalizes rwaData.price to price field', async () => {
    arrangeMocks({
      tokens: [
        createRwaToken({
          rwaData: { ...createRwaToken().rwaData, price: '200.00' },
        }),
      ],
    });

    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data[0].price).toBe('200.00');
  });

  it('passes price_change_asc sortBy when ascending PriceChange selected', async () => {
    renderHookWithProvider(() =>
      useRwaTokens({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.PriceChange,
          direction: SortDirection.Ascending,
        },
      }),
    );

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'price_change_asc' }),
      );
    });
  });

  it('passes volume_desc sortBy when descending Volume selected', async () => {
    renderHookWithProvider(() =>
      useRwaTokens({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.Volume,
          direction: SortDirection.Descending,
        },
      }),
    );

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'volume_desc' }),
      );
    });
  });

  it('passes market_cap_asc sortBy when ascending MarketCap selected', async () => {
    renderHookWithProvider(() =>
      useRwaTokens({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.MarketCap,
          direction: SortDirection.Ascending,
        },
      }),
    );

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'market_cap_asc' }),
      );
    });
  });

  it('passes searchQuery to fetchRwas instead of filtering locally', async () => {
    renderHookWithProvider(() => useRwaTokens({ searchQuery: 'OUSG' }));

    await waitFor(() => {
      expect(mockFetchRwas).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'OUSG' }),
      );
    });
  });

  it('returns server search results as-is when searchQuery is provided', async () => {
    const tokens = [
      createRwaToken({
        assetId: 'eip155:1/erc20:0x111' as CaipAssetType,
        symbol: 'OUSG',
        name: 'OUSG Token',
      }),
      createRwaToken({
        assetId: 'eip155:1/erc20:0x222' as CaipAssetType,
        symbol: 'USDY',
        name: 'USDY Token',
      }),
    ];
    arrangeMocks({ tokens });

    const { result } = renderHookWithProvider(() =>
      useRwaTokens({ searchQuery: 'OUSG' }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.map((token) => token.symbol)).toEqual([
      'OUSG',
      'USDY',
    ]);
  });

  it('returns isLoading true while fetch is in flight', () => {
    mockFetchRwas.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHookWithProvider(() => useRwaTokens());

    expect(result.current.isLoading).toBe(true);
  });

  it('returns empty data and stops loading on fetch error', async () => {
    arrangeMocks({ rejectWith: new Error('Network error') });

    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns totalCount from the RWA response', async () => {
    mockFetchRwas.mockResolvedValue(
      createRwasResponse(
        [createRwaToken()],
        {
          nextCursor: null,
          hasNextPage: false,
        },
        12,
      ),
    );

    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalCount).toBe(12);
  });

  it('exposes a refetch function that re-calls fetchRwas', async () => {
    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetchRwas).toHaveBeenCalledTimes(2);
  });

  it('returns empty data when fetchRwas returns no tokens', async () => {
    arrangeMocks({ tokens: [] });

    const { result } = renderHookWithProvider(() => useRwaTokens());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  describe('pagination', () => {
    it('exposes hasNextPage false when no next page', async () => {
      arrangeMocks({ hasNextPage: false });

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(false);
    });

    it('exposes hasNextPage true when server signals more pages', async () => {
      arrangeMocks({ hasNextPage: true, nextCursor: 'cursor-abc' });

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNextPage).toBe(true);
    });

    it('loadMore appends tokens from the next page', async () => {
      const page1Token = createRwaToken({
        assetId: 'eip155:1/erc20:0x111' as CaipAssetType,
        symbol: 'A',
      });
      const page2Token = createRwaToken({
        assetId: 'eip155:1/erc20:0x222' as CaipAssetType,
        symbol: 'B',
      });

      mockFetchRwas
        .mockResolvedValueOnce(
          createRwasResponse([page1Token], {
            nextCursor: 'cursor-1',
            hasNextPage: true,
          }),
        )
        .mockResolvedValueOnce(
          createRwasResponse([page2Token], {
            nextCursor: null,
            hasNextPage: false,
          }),
        );

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].symbol).toBe('A');

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.data).toHaveLength(2);
      });

      expect(result.current.data[1].symbol).toBe('B');
      expect(result.current.hasNextPage).toBe(false);
    });

    it('loadMore passes the cursor to fetchRwas', async () => {
      const page1Token = createRwaToken();

      mockFetchRwas
        .mockResolvedValueOnce(
          createRwasResponse([page1Token], {
            nextCursor: 'cursor-xyz',
            hasNextPage: true,
          }),
        )
        .mockResolvedValueOnce(
          createRwasResponse([], { nextCursor: null, hasNextPage: false }),
        );

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetchRwas).toHaveBeenLastCalledWith(
        expect.objectContaining({ after: 'cursor-xyz' }),
      );
    });

    it('loadMore does nothing when hasNextPage is false', async () => {
      arrangeMocks({ hasNextPage: false });

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetchRwas).toHaveBeenCalledTimes(1);
    });

    it('loadMore is silent on error and keeps existing tokens', async () => {
      const page1Token = createRwaToken({ symbol: 'A' });

      mockFetchRwas
        .mockResolvedValueOnce(
          createRwasResponse([page1Token], {
            nextCursor: 'cursor-1',
            hasNextPage: true,
          }),
        )
        .mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.isLoadingMore).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].symbol).toBe('A');
    });

    it('ignores a stale loadMore response after refetch', async () => {
      const page1Token = createRwaToken({ symbol: 'A' });
      const stalePage2Token = createRwaToken({ symbol: 'B' });
      const refetchedToken = createRwaToken({ symbol: 'C' });
      let resolveLoadMore: (
        response: ReturnType<typeof createRwasResponse>,
      ) => void = jest.fn();

      mockFetchRwas
        .mockResolvedValueOnce(
          createRwasResponse([page1Token], {
            nextCursor: 'cursor-1',
            hasNextPage: true,
          }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<ReturnType<typeof createRwasResponse>>((resolve) => {
              resolveLoadMore = resolve;
            }),
        )
        .mockResolvedValueOnce(
          createRwasResponse([refetchedToken], {
            nextCursor: null,
            hasNextPage: false,
          }),
        );

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let loadMorePromise: Promise<void> | undefined;
      await act(async () => {
        loadMorePromise = result.current.loadMore();
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data.map((token) => token.symbol)).toEqual(['C']);
      });

      await act(async () => {
        resolveLoadMore(
          createRwasResponse([stalePage2Token], {
            nextCursor: null,
            hasNextPage: false,
          }),
        );
        await loadMorePromise;
      });

      expect(result.current.data.map((token) => token.symbol)).toEqual(['C']);
    });

    it('does not load more while a refetch is starting', async () => {
      const page1Token = createRwaToken({ symbol: 'A' });
      let resolveRefetch: (
        response: ReturnType<typeof createRwasResponse>,
      ) => void = jest.fn();

      mockFetchRwas
        .mockResolvedValueOnce(
          createRwasResponse([page1Token], {
            nextCursor: 'cursor-1',
            hasNextPage: true,
          }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<ReturnType<typeof createRwasResponse>>((resolve) => {
              resolveRefetch = resolve;
            }),
        );

      const { result } = renderHookWithProvider(() => useRwaTokens());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let refetchPromise: Promise<void> = Promise.resolve();
      await act(async () => {
        refetchPromise = result.current.refetch();
        await result.current.loadMore();
      });

      expect(mockFetchRwas).toHaveBeenCalledTimes(2);
      expect(mockFetchRwas).not.toHaveBeenCalledWith(
        expect.objectContaining({ after: 'cursor-1' }),
      );

      await act(async () => {
        resolveRefetch(
          createRwasResponse([], {
            nextCursor: null,
            hasNextPage: false,
          }),
        );
        await refetchPromise;
      });
    });
  });
});
