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

const mockUseTrendingSearch = jest.fn();
const mockUsePerpsMarkets = jest.fn();
const mockUsePredictMarketData = jest.fn();
const mockUseSitesData = jest.fn();

jest.mock(
  '../../../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({
    useTrendingSearch: () => mockUseTrendingSearch(),
  }),
);

jest.mock('../../../../../../UI/Perps/hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: () => mockUsePerpsMarkets(),
}));

jest.mock('../../../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: () => mockUsePredictMarketData(),
}));

jest.mock('../../../../../../UI/Sites/hooks/useSiteData/useSitesData', () => ({
  useSitesData: () => mockUseSitesData(),
}));

describe('useExploreSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseTrendingSearch.mockReturnValue({
      data: mockTrendingTokens,
      isLoading: false,
      refetch: jest.fn(),
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: mockPerpsMarkets,
      isLoading: false,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    mockUsePredictMarketData.mockReturnValue({
      marketData: mockPredictionMarkets,
      isFetching: false,
      refetch: jest.fn(),
    });

    mockUseSitesData.mockReturnValue({
      sites: mockSites,
      isLoading: false,
      refetch: jest.fn(),
    });
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

  it('filters tokens by symbol when query matches', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'btc' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.tokens).toHaveLength(1);
      expect((result.current.data.tokens[0] as { symbol: string }).symbol).toBe(
        'BTC',
      );
    });
  });

  it('filters tokens by name when query matches', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'ethereum' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.tokens).toHaveLength(1);
      expect((result.current.data.tokens[0] as { name: string }).name).toBe(
        'Ethereum',
      );
    });
  });

  it('performs case insensitive search', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'BITCOIN' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.tokens.length).toBeGreaterThan(0);
      expect((result.current.data.tokens[0] as { name: string }).name).toBe(
        'Bitcoin',
      );
    });
  });

  it('filters perps markets by symbol', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'doge' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.perps).toHaveLength(1);
      expect((result.current.data.perps[0] as { symbol: string }).symbol).toBe(
        'DOGE-USD',
      );
    });
  });

  it('filters predictions by title', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'trump' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.data.predictions).toHaveLength(1);
      expect(
        (result.current.data.predictions[0] as { title: string }).title,
      ).toBe('Trump election results');
    });
  });

  it('returns empty arrays when no items match query', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'nonexistent' });

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

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.data.tokens.length).toBe(initialTokenCount);

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.data.tokens.length).toBeLessThan(initialTokenCount);
    });
  });

  it('returns loading states for each section', () => {
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    mockUsePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: true,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: true,
      refetch: jest.fn(),
    });

    mockUseSitesData.mockReturnValue({
      sites: [],
      isLoading: true,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useExploreSearch(''));

    expect(result.current.isLoading.tokens).toBe(true);
    expect(result.current.isLoading.perps).toBe(true);
    expect(result.current.isLoading.predictions).toBe(true);
    expect(result.current.isLoading.sites).toBe(true);
  });

  it('filters across multiple sections simultaneously', async () => {
    const { result, rerender } = renderHook(
      ({ query }) => useExploreSearch(query),
      { initialProps: { query: '' } },
    );

    rerender({ query: 'sol' });

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      const hasTokenMatch = result.current.data.tokens.length > 0;
      const hasPerpsMatch = result.current.data.perps.length > 0;
      const hasPredictionsMatch = result.current.data.predictions.length > 0;

      expect(hasTokenMatch || hasPerpsMatch || hasPredictionsMatch).toBe(true);
    });
  });

  it('processes all sections defined in config', () => {
    const { result } = renderHook(() => useExploreSearch(''));

    SECTIONS_ARRAY.forEach((section) => {
      expect(result.current.data[section.id]).toBeDefined();
      expect(result.current.isLoading[section.id]).toBeDefined();
    });
  });
});
