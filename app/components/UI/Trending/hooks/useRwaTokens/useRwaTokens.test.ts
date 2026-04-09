import { useRwaTokens } from './useRwaTokens';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import {
  PriceChangeOption,
  SortDirection,
} from '../../components/TrendingTokensBottomSheet';
import { RWA_CHAIN_IDS } from '../../utils/trendingNetworksList';
import type { CaipChainId } from '@metamask/utils';

jest.mock('../useSearchRequest/useSearchRequest');
jest.mock('../../utils/sortTrendingTokens');

const mockUseSearchRequest = jest.mocked(useSearchRequest);
const mockSortTrendingTokens = jest.mocked(sortTrendingTokens);

const mockRefetch = jest.fn();

const createSearchResult = (overrides: Record<string, unknown> = {}) => ({
  assetId: 'eip155:1/erc20:0xaaa' as CaipChainId,
  symbol: 'OUSG',
  name: 'OUSG Token',
  decimals: 18,
  price: '100.50',
  aggregatedUsdVolume: 500000,
  marketCap: 1000000000,
  pricePercentChange1d: '1.5',
  rwaData: { underlyingAsset: 'US Treasury' },
  ...overrides,
});

const arrangeMocks = (options?: {
  results?: ReturnType<typeof createSearchResult>[];
  isLoading?: boolean;
}) => {
  mockUseSearchRequest.mockReturnValue({
    results: (options?.results ?? []) as ReturnType<
      typeof useSearchRequest
    >['results'],
    isLoading: options?.isLoading ?? false,
    error: null,
    search: mockRefetch,
  });
  mockSortTrendingTokens.mockImplementation((tokens) => tokens);
};

const NON_RESTRICTED_GEO_STATE = {
  state: {
    engine: {
      backgroundState: {
        GeolocationController: { location: 'AR' },
      },
    },
  },
};

const renderHookWithGeo = (
  geolocation: string | undefined,
  hookOpts?: Parameters<typeof useRwaTokens>[0],
) =>
  renderHookWithProvider(() => useRwaTokens(hookOpts), {
    state: {
      engine: {
        backgroundState: {
          GeolocationController: { location: geolocation ?? 'UNKNOWN' },
        },
      },
    },
  });

describe('useRwaTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeMocks();
  });

  it('calls useSearchRequest with correct defaults', () => {
    renderHookWithProvider(() => useRwaTokens(), NON_RESTRICTED_GEO_STATE);

    expect(mockUseSearchRequest).toHaveBeenCalledWith({
      query: '(Ondo Tokenized)',
      limit: 500,
      chainIds: RWA_CHAIN_IDS,
      includeMarketData: true,
    });
  });

  it('uses provided chainIds instead of defaults', () => {
    const customChainIds: CaipChainId[] = ['eip155:137' as CaipChainId];

    renderHookWithProvider(
      () => useRwaTokens({ chainIds: customChainIds }),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(mockUseSearchRequest).toHaveBeenCalledWith(
      expect.objectContaining({ chainIds: customChainIds }),
    );
  });

  it('defaults to RWA_CHAIN_IDS when chainIds is null', () => {
    renderHookWithProvider(
      () => useRwaTokens({ chainIds: null }),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(mockUseSearchRequest).toHaveBeenCalledWith(
      expect.objectContaining({ chainIds: RWA_CHAIN_IDS }),
    );
  });

  it('filters out assets without rwaData', () => {
    const rwaAsset = createSearchResult({ assetId: 'eip155:1/erc20:0x111' });
    const nonRwaAsset = createSearchResult({
      assetId: 'eip155:1/erc20:0x222',
      symbol: 'ETH',
      name: 'Ethereum',
      rwaData: undefined,
    });
    arrangeMocks({ results: [rwaAsset, nonRwaAsset] });

    const { result } = renderHookWithProvider(
      () => useRwaTokens(),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].symbol).toBe('OUSG');
  });

  it('normalizes pricePercentChange1d to priceChangePct.h24', () => {
    arrangeMocks({
      results: [createSearchResult({ pricePercentChange1d: '3.14' })],
    });

    const { result } = renderHookWithProvider(
      () => useRwaTokens(),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(result.current.data[0].priceChangePct).toEqual({ h24: '3.14' });
  });

  it('sorts results with default options when no searchQuery', () => {
    const results = [
      createSearchResult({ assetId: 'eip155:1/erc20:0x111', symbol: 'A' }),
      createSearchResult({ assetId: 'eip155:1/erc20:0x222', symbol: 'B' }),
    ];
    arrangeMocks({ results });

    renderHookWithProvider(() => useRwaTokens(), NON_RESTRICTED_GEO_STATE);

    expect(mockSortTrendingTokens).toHaveBeenCalledWith(
      expect.any(Array),
      PriceChangeOption.PriceChange,
      SortDirection.Descending,
    );
  });

  it('sorts results with custom sort options', () => {
    arrangeMocks({ results: [createSearchResult()] });

    renderHookWithProvider(
      () =>
        useRwaTokens({
          sortTrendingTokensOptions: {
            option: PriceChangeOption.Volume,
            direction: SortDirection.Ascending,
          },
        }),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(mockSortTrendingTokens).toHaveBeenCalledWith(
      expect.any(Array),
      PriceChangeOption.Volume,
      SortDirection.Ascending,
    );
  });

  it('applies fuse search instead of sorting when searchQuery is provided', () => {
    const results = [
      createSearchResult({
        assetId: 'eip155:1/erc20:0x111',
        symbol: 'OUSG',
        name: 'OUSG Token',
      }),
      createSearchResult({
        assetId: 'eip155:1/erc20:0x222',
        symbol: 'USDY',
        name: 'USDY Token',
      }),
    ];
    arrangeMocks({ results });

    const { result } = renderHookWithProvider(
      () => useRwaTokens({ searchQuery: 'OUSG' }),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(mockSortTrendingTokens).not.toHaveBeenCalled();
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].symbol).toBe('OUSG');
  });

  it('returns empty array when no results match search query', () => {
    arrangeMocks({ results: [createSearchResult()] });

    const { result } = renderHookWithProvider(
      () => useRwaTokens({ searchQuery: 'nonexistent' }),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(result.current.data).toHaveLength(0);
  });

  it('passes through isLoading from useSearchRequest', () => {
    arrangeMocks({ isLoading: true });

    const { result } = renderHookWithProvider(
      () => useRwaTokens(),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('exposes refetch from useSearchRequest', () => {
    const { result } = renderHookWithProvider(
      () => useRwaTokens(),
      NON_RESTRICTED_GEO_STATE,
    );

    result.current.refetch();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty data when useSearchRequest returns no results', () => {
    arrangeMocks({ results: [] });

    const { result } = renderHookWithProvider(
      () => useRwaTokens(),
      NON_RESTRICTED_GEO_STATE,
    );

    expect(result.current.data).toEqual([]);
  });

  describe('geo-restriction (production mode)', () => {
    const originalDev = (globalThis as Record<string, unknown>).__DEV__;

    beforeEach(() => {
      (globalThis as Record<string, unknown>).__DEV__ = false;
    });

    afterEach(() => {
      (globalThis as Record<string, unknown>).__DEV__ = originalDev;
    });

    it('returns empty data for a restricted country', () => {
      arrangeMocks({ results: [createSearchResult()] });

      const { result } = renderHookWithGeo('US');

      expect(result.current.data).toEqual([]);
    });

    it('returns empty data when geolocation is unknown', () => {
      arrangeMocks({ results: [createSearchResult()] });

      const { result } = renderHookWithGeo(undefined);

      expect(result.current.data).toEqual([]);
    });

    it('returns data for a non-restricted country', () => {
      arrangeMocks({ results: [createSearchResult()] });

      const { result } = renderHookWithGeo('AR');

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].symbol).toBe('OUSG');
    });

    it('handles region suffixes correctly', () => {
      arrangeMocks({ results: [createSearchResult()] });

      const { result } = renderHookWithGeo('GB-ENG');

      expect(result.current.data).toEqual([]);
    });

    it('sends empty query to search API when restricted', () => {
      renderHookWithGeo('US');

      expect(mockUseSearchRequest).toHaveBeenCalledWith(
        expect.objectContaining({ query: '' }),
      );
    });
  });
});
