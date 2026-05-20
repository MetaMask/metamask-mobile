import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { PredictMarket, Recurrence } from '../types';
import { usePredictSearchMarketData } from './usePredictSearchMarketData';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockSearchMarkets = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      searchMarkets: (...args: unknown[]) => mockSearchMarkets(...args),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const makeMarket = (id: string): PredictMarket => ({
  id,
  providerId: POLYMARKET_PROVIDER_ID,
  slug: `market-${id}`,
  title: `Market ${id}`,
  description: 'A prediction market',
  image: 'https://example.com/img.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['trending'],
  outcomes: [],
  liquidity: 1000000,
  volume: 1000000,
});

const makeSearchResult = (
  markets: PredictMarket[],
  totalResults = markets.length,
) => ({ markets, totalResults });

const mockMarketData: PredictMarket[] = [makeMarket('market-1')];

describe('usePredictSearchMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchMarkets.mockResolvedValue(makeSearchResult(mockMarketData));
  });

  it('does not fetch when disabled', () => {
    const { Wrapper } = createWrapper();
    renderHook(() => usePredictSearchMarketData({ q: '', enabled: false }), {
      wrapper: Wrapper,
    });

    expect(mockSearchMarkets).not.toHaveBeenCalled();
  });

  it('calls searchMarkets with an empty query (controller handles empty gracefully)', async () => {
    mockSearchMarkets.mockResolvedValue(makeSearchResult([]));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePredictSearchMarketData({ q: '' }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockSearchMarkets).toHaveBeenCalledWith({
      q: '',
      limit: 20,
      page: 1,
    });
    expect(result.current.marketData).toEqual([]);
  });

  it('trims and searches non-empty queries', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePredictSearchMarketData({ q: ' bitcoin ', pageSize: 10 }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(mockSearchMarkets).toHaveBeenCalledWith({
      q: 'bitcoin',
      limit: 10,
      page: 1,
    });
    expect(result.current.marketData).toEqual(mockMarketData);
  });

  it('exposes totalResults from the first page', async () => {
    mockSearchMarkets.mockResolvedValue(makeSearchResult(mockMarketData, 232));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePredictSearchMarketData({ q: 'bitcoin' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.totalResults).toBe(232);
  });

  it('sets error and clears data when search throws', async () => {
    mockSearchMarkets.mockRejectedValue(new Error('Search failed'));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePredictSearchMarketData({ q: 'bitcoin' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false), {
      timeout: 7000,
    });

    expect(result.current.error).toBe('Search failed');
    expect(result.current.marketData).toEqual([]);
  });

  describe('pagination (search path)', () => {
    it('returns hasMore=true when server totalResults exceeds fetched count', async () => {
      const pageSize = 2;
      const fullPage = [makeMarket('a'), makeMarket('b')];
      // totalResults=5 means 2 fetched < 5 total → more pages exist
      mockSearchMarkets.mockResolvedValue(makeSearchResult(fullPage, 5));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictSearchMarketData({ q: 'eth', pageSize }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.hasMore).toBe(true);
      expect(result.current.marketData).toEqual(fullPage);
    });

    it('returns hasMore=false when fetched count equals server totalResults', async () => {
      const pageSize = 5;
      const partialPage = [makeMarket('a'), makeMarket('b')];
      // totalResults=2 means 2 fetched === 2 total → no more pages
      mockSearchMarkets.mockResolvedValue(makeSearchResult(partialPage, 2));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictSearchMarketData({ q: 'eth', pageSize }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.hasMore).toBe(false);
    });

    it('fetchMore appends the next page and increments the page number', async () => {
      const pageSize = 2;
      const page1 = [makeMarket('a'), makeMarket('b')];
      const page2 = [makeMarket('c'), makeMarket('d')];
      mockSearchMarkets
        .mockResolvedValueOnce(makeSearchResult(page1, 4))
        .mockResolvedValueOnce(makeSearchResult(page2, 4));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictSearchMarketData({ q: 'eth', pageSize }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));
      expect(result.current.marketData).toEqual(page1);
      expect(result.current.totalResults).toBe(4);

      act(() => {
        result.current.fetchMore();
      });

      await waitFor(() =>
        expect(result.current.marketData).toEqual([...page1, ...page2]),
      );

      expect(mockSearchMarkets).toHaveBeenCalledTimes(2);
      expect(mockSearchMarkets).toHaveBeenNthCalledWith(2, {
        q: 'eth',
        limit: pageSize,
        page: 2,
      });
      expect(result.current.totalResults).toBe(4);
    });

    it('sets hasMore=false when all pages have been fetched per totalResults', async () => {
      const pageSize = 2;
      const page1 = [makeMarket('a'), makeMarket('b')];
      const page2 = [makeMarket('c')];
      // totalResults=3 means after fetching 3 items there are no more pages
      mockSearchMarkets
        .mockResolvedValueOnce(makeSearchResult(page1, 3))
        .mockResolvedValueOnce(makeSearchResult(page2, 3));

      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictSearchMarketData({ q: 'eth', pageSize }),
        { wrapper: Wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      act(() => {
        result.current.fetchMore();
      });

      await waitFor(() =>
        expect(result.current.marketData).toEqual([...page1, ...page2]),
      );

      expect(result.current.hasMore).toBe(false);
    });

    it('exposes isFetchingMore=false and hasMore=false when disabled', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictSearchMarketData({ q: 'eth', enabled: false }),
        { wrapper: Wrapper },
      );

      expect(result.current.isFetchingMore).toBe(false);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.totalResults).toBe(0);
      expect(result.current.marketData).toEqual([]);
    });
  });
});
