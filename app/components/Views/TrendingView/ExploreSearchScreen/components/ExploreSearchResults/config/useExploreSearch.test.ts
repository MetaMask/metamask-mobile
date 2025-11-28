import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useExploreSearch } from './useExploreSearch';
import { SECTIONS_ARRAY } from '../../../../config/sections.config';

const mockTrendingTokens = [
  { assetId: '1', symbol: 'BTC', name: 'Bitcoin' },
  { assetId: '2', symbol: 'ETH', name: 'Ethereum' },
  { assetId: '3', symbol: 'SOL', name: 'Solana' },
  { assetId: '4', symbol: 'USDC', name: 'USD Coin' },
  { assetId: '5', symbol: 'USDT', name: 'Tether' },
];

const mockPerpsMarkets = [
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SOL-USD', name: 'Solana' },
  { symbol: 'DOGE-USD', name: 'Dogecoin' },
];

const mockPredictionMarkets = [
  { id: '1', title: 'Will Bitcoin reach 100k?' },
  { id: '2', title: 'Ethereum price prediction' },
  { id: '3', title: 'Solana network upgrade' },
  { id: '4', title: 'Trump election results' },
];

const mockSites = [
  {
    id: '1',
    name: 'Uniswap',
    url: 'https://uniswap.org',
    displayUrl: 'uniswap.org',
  },
  {
    id: '2',
    name: 'OpenSea',
    url: 'https://opensea.io',
    displayUrl: 'opensea.io',
  },
  { id: '3', name: 'Aave', url: 'https://aave.com', displayUrl: 'aave.com' },
  {
    id: '4',
    name: 'Compound',
    url: 'https://compound.finance',
    displayUrl: 'compound.finance',
  },
];

let mockTrendingData = mockTrendingTokens;
let mockTrendingLoading = false;
let mockPerpsData = mockPerpsMarkets;
let mockPerpsLoading = false;
let mockPredictionsData = mockPredictionMarkets;
let mockPredictionsLoading = false;
let mockSitesData = mockSites;
let mockSitesLoading = false;

jest.mock(
  '../../../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({
    useTrendingSearch: () => ({
      data: mockTrendingData,
      isLoading: mockTrendingLoading,
      refetch: jest.fn(),
    }),
  }),
);

jest.mock('../../../../../../UI/Perps/hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: () => ({
    markets: mockPerpsData,
    isLoading: mockPerpsLoading,
    refresh: jest.fn(),
    isRefreshing: false,
  }),
}));

jest.mock('../../../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: () => ({
    marketData: mockPredictionsData,
    isFetching: mockPredictionsLoading,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../../../../UI/Sites/hooks/useSiteData/useSitesData', () => ({
  useSitesData: () => ({
    sites: mockSitesData,
    isLoading: mockSitesLoading,
    refetch: jest.fn(),
  }),
}));

describe('useExploreSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();

    // Reset to default values
    mockTrendingData = mockTrendingTokens;
    mockTrendingLoading = false;
    mockPerpsData = mockPerpsMarkets;
    mockPerpsLoading = false;
    mockPredictionsData = mockPredictionMarkets;
    mockPredictionsLoading = false;
    mockSitesData = mockSites;
    mockSitesLoading = false;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('returns top 3 items from each section when query is empty', () => {
    const { result } = renderHook(() => useExploreSearch(''));

    expect(result.current.data.tokens).toHaveLength(3);
    expect(result.current.data.perps).toHaveLength(3);
    expect(result.current.data.predictions).toHaveLength(3);
    expect(result.current.data.sites).toHaveLength(3);
  });

  it('returns top 3 items when query contains only whitespace', () => {
    const { result } = renderHook(() => useExploreSearch('   '));

    expect(result.current.data.tokens).toHaveLength(3);
    expect(result.current.data.perps).toHaveLength(3);
    expect(result.current.data.predictions).toHaveLength(3);
    expect(result.current.data.sites).toHaveLength(3);
  });

  it('returns empty arrays when section hooks return no data', async () => {
    mockTrendingData = [];
    mockPerpsData = [];
    mockPredictionsData = [];
    mockSitesData = [];

    const { result } = renderHook(() => useExploreSearch('test'));

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.tokens).toHaveLength(0);
      expect(result.current.data.perps).toHaveLength(0);
      expect(result.current.data.predictions).toHaveLength(0);
      expect(result.current.data.sites).toHaveLength(0);
    });
  });

  it('debounces query changes by 200ms', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    const initialTokenCount = result.current.data.tokens.length;

    rerender({ query: 'btc' });

    // Before debounce completes, should still show initial count (top 3)
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.data.tokens.length).toBe(initialTokenCount);

    // After full debounce time, query should be processed
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.data.tokens.length).toBeGreaterThan(0);
    });
  });

  it('shows loading state while debouncing', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    expect(result.current.isLoading.tokens).toBe(false);

    rerender({ query: 'test' });

    expect(result.current.isLoading.tokens).toBe(true);
    expect(result.current.isLoading.perps).toBe(true);
    expect(result.current.isLoading.predictions).toBe(true);
    expect(result.current.isLoading.sites).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isLoading.tokens).toBe(false);
    });
  });

  it('aggregates loading states from section hooks', () => {
    mockTrendingLoading = true;
    mockPerpsLoading = true;
    mockPredictionsLoading = true;
    mockSitesLoading = true;

    const { result } = renderHook(() => useExploreSearch(''));

    expect(result.current.isLoading.tokens).toBe(true);
    expect(result.current.isLoading.perps).toBe(true);
    expect(result.current.isLoading.predictions).toBe(true);
    expect(result.current.isLoading.sites).toBe(true);
  });

  it('processes all sections defined in config', () => {
    const { result } = renderHook(() => useExploreSearch(''));

    SECTIONS_ARRAY.forEach((section) => {
      expect(result.current.data[section.id]).toBeDefined();
      expect(result.current.isLoading[section.id]).toBeDefined();
    });
  });
});
