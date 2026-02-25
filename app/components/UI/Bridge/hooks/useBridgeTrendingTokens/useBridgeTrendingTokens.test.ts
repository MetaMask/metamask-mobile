import { renderHook, act } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { useBridgeTrendingTokens } from './useBridgeTrendingTokens';
import { useTrendingRequest } from '../../../Trending/hooks/useTrendingRequest/useTrendingRequest';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../Trending/components/TrendingTokensBottomSheet';
import { TrendingAsset } from '@metamask/assets-controllers';

jest.mock(
  '../../../Trending/hooks/useTrendingRequest/useTrendingRequest',
  () => ({
    useTrendingRequest: jest.fn(),
  }),
);

const mockUseTrendingRequest = jest.mocked(useTrendingRequest);

const mockTrendingResults: TrendingAsset[] = [
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000001',
    symbol: 'AAA',
    name: 'Token AAA',
    decimals: 18,
    price: '1',
    aggregatedUsdVolume: 400,
    marketCap: 2000,
    priceChangePct: { h24: '2', h6: '1', h1: '5', m5: '0.1' },
  },
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000002',
    symbol: 'BBB',
    name: 'Token BBB',
    decimals: 18,
    price: '2',
    aggregatedUsdVolume: 200,
    marketCap: 3000,
    priceChangePct: { h24: '10', h6: '7', h1: '2', m5: '0.2' },
  },
  {
    assetId: 'eip155:1/erc20:0x0000000000000000000000000000000000000003',
    symbol: 'CCC',
    name: 'Token CCC',
    decimals: 18,
    price: '3',
    aggregatedUsdVolume: 100,
    marketCap: 1000,
    priceChangePct: { h24: '-1', h6: '-2', h1: '-3', m5: '-0.3' },
  },
] as TrendingAsset[];

describe('useBridgeTrendingTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrendingRequest.mockReturnValue({
      results: mockTrendingResults,
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });
  });

  it('returns expected default state', () => {
    const { result } = renderHook(() =>
      useBridgeTrendingTokens({
        networkConfigurations: {},
      }),
    );

    expect(result.current.selectedTimeOption).toBe(TimeOption.TwentyFourHours);
    expect(result.current.selectedNetwork).toBeNull();
    expect(result.current.selectedPriceChangeOption).toBe(
      PriceChangeOption.PriceChange,
    );
    expect(result.current.priceChangeSortDirection).toBe(
      SortDirection.Descending,
    );
    expect(result.current.selectedNetworkName).toBe(
      strings('trending.all_networks'),
    );
    expect(result.current.priceChangeButtonText).toBe(
      strings('trending.price_change'),
    );
    expect(result.current.filterContext).toEqual({
      timeFilter: TimeOption.TwentyFourHours,
      sortOption: PriceChangeOption.PriceChange,
      networkFilter: 'all',
      isSearchResult: false,
    });
  });

  it('updates state via handlers', () => {
    const { result } = renderHook(() =>
      useBridgeTrendingTokens({
        networkConfigurations: {
          'eip155:1': { name: 'Ethereum' },
        },
      }),
    );

    act(() => {
      result.current.handleNetworkSelect(['eip155:1']);
    });
    expect(result.current.selectedNetwork).toEqual(['eip155:1']);
    expect(result.current.selectedNetworkName).toBe('Ethereum');

    act(() => {
      result.current.handleTimeSelect('h1_trending', TimeOption.OneHour);
    });
    expect(result.current.sortBy).toBe('h1_trending');
    expect(result.current.selectedTimeOption).toBe(TimeOption.OneHour);

    act(() => {
      result.current.handlePriceChangeSelect(
        PriceChangeOption.MarketCap,
        SortDirection.Ascending,
      );
    });
    expect(result.current.selectedPriceChangeOption).toBe(
      PriceChangeOption.MarketCap,
    );
    expect(result.current.priceChangeSortDirection).toBe(
      SortDirection.Ascending,
    );
  });

  it('sorts trending tokens based on selected option and direction', () => {
    const { result } = renderHook(() =>
      useBridgeTrendingTokens({
        networkConfigurations: {},
      }),
    );

    // Default mode sorts by price change high-to-low.
    expect(result.current.trendingTokens.map((token) => token.symbol)).toEqual([
      'BBB',
      'AAA',
      'CCC',
    ]);

    act(() => {
      result.current.handlePriceChangeSelect(
        PriceChangeOption.Volume,
        SortDirection.Ascending,
      );
    });
    expect(result.current.trendingTokens.map((token) => token.symbol)).toEqual([
      'CCC',
      'BBB',
      'AAA',
    ]);

    act(() => {
      result.current.handlePriceChangeSelect(
        PriceChangeOption.MarketCap,
        SortDirection.Descending,
      );
    });
    expect(result.current.trendingTokens.map((token) => token.symbol)).toEqual([
      'BBB',
      'AAA',
      'CCC',
    ]);

    act(() => {
      result.current.handlePriceChangeSelect(
        PriceChangeOption.PriceChange,
        SortDirection.Descending,
      );
    });
    expect(result.current.trendingTokens.map((token) => token.symbol)).toEqual([
      'BBB',
      'AAA',
      'CCC',
    ]);
  });

  it('keeps API order on initial load when it is already price-change sorted', () => {
    const preSortedByPriceChangeDesc: TrendingAsset[] = [
      mockTrendingResults[1],
      mockTrendingResults[0],
      mockTrendingResults[2],
    ];
    mockUseTrendingRequest.mockReturnValue({
      results: preSortedByPriceChangeDesc,
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useBridgeTrendingTokens({
        networkConfigurations: {},
      }),
    );

    expect(result.current.trendingTokens).toBe(preSortedByPriceChangeDesc);
  });
});
