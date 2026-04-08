import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictMarketData } from './usePredictMarketData';
import { PredictMarket, Recurrence } from '../types';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';

const mockGetMarkets = jest.fn();
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: (...args: unknown[]) => mockGetMarkets(...args),
    },
  },
}));
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));
jest.mock('../utils/predictErrorHandler', () => ({
  ensureError: (err: unknown) =>
    err instanceof Error ? err : new Error(String(err)),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const mockMarketData: PredictMarket[] = [
  {
    id: 'market-1',
    providerId: POLYMARKET_PROVIDER_ID,
    slug: 'bitcoin-price-prediction',
    title: 'Will Bitcoin reach $100k by end of 2024?',
    description: 'Bitcoin price prediction market',
    image: 'https://example.com/btc.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['trending'],
    outcomes: [
      {
        id: 'outcome-1',
        providerId: POLYMARKET_PROVIDER_ID,
        marketId: 'market-1',
        title: 'Yes',
        description: 'Bitcoin will reach $100k',
        image: '',
        status: 'open',
        tokens: [
          {
            id: 'token-1',
            title: 'Yes',
            price: 0.65,
          },
        ],
        volume: 1000000,
        groupItemTitle: 'Yes/No',
      },
      {
        id: 'outcome-2',
        providerId: POLYMARKET_PROVIDER_ID,
        marketId: 'market-1',
        title: 'No',
        description: 'Bitcoin will not reach $100k',
        image: '',
        status: 'open',
        tokens: [
          {
            id: 'token-2',
            title: 'No',
            price: 0.35,
          },
        ],
        volume: 1000000,
        groupItemTitle: 'Yes/No',
      },
    ],
    liquidity: 1000000,
    volume: 1000000,
  },
  {
    id: 'market-2',
    providerId: POLYMARKET_PROVIDER_ID,
    slug: 'ethereum-price-prediction',
    title: 'Will Ethereum reach $100000 by end of 2025?',
    description: 'Ethereum price prediction market',
    image: 'https://example.com/eth.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['trending'],
    outcomes: [
      {
        id: 'outcome-3',
        providerId: POLYMARKET_PROVIDER_ID,
        marketId: 'market-2',
        title: 'Yes',
        description: 'Ethereum will reach $100k',
        image: '',
        status: 'open',
        tokens: [
          {
            id: 'token-3',
            title: 'Yes',
            price: 0.45,
          },
        ],
        volume: 500000,
        groupItemTitle: 'Yes/No',
      },
      {
        id: 'outcome-4',
        providerId: POLYMARKET_PROVIDER_ID,
        marketId: 'market-2',
        title: 'No',
        description: 'Ethereum will not reach $100k',
        image: '',
        status: 'open',
        tokens: [
          {
            id: 'token-4',
            title: 'No',
            price: 0.55,
          },
        ],
        volume: 500000,
        groupItemTitle: 'Yes/No',
      },
    ],
    liquidity: 1000000,
    volume: 1000000,
  },
];

describe('usePredictMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns market data for default trending category', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result } = renderHook(() => usePredictMarketData(), {
      wrapper: Wrapper,
    });

    // Initially loading
    expect(result.current.isFetching).toBe(true);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    expect(mockGetMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'trending',
        limit: 20,
        offset: 0,
      }),
    );
  });

  it('handles null market data', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockResolvedValue(null);

    const { result } = renderHook(() => usePredictMarketData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('handles empty market data array', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockResolvedValue([]);

    const { result } = renderHook(() => usePredictMarketData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('refetches data when calling refetch', async () => {
    const { Wrapper } = createWrapper();
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result } = renderHook(() => usePredictMarketData(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
  });

  describe('customQueryParams option', () => {
    it('passes customQueryParams to getMarkets', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarkets.mockResolvedValue(mockMarketData);

      const { result } = renderHook(
        () =>
          usePredictMarketData({
            category: 'hot',
            customQueryParams: 'tag_id=149&order=volume24hr',
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'hot',
          customQueryParams: 'tag_id=149&order=volume24hr',
        }),
      );
    });

    it('refetches when customQueryParams changes', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarkets.mockResolvedValue(mockMarketData);

      const { result, rerender } = renderHook(
        ({ customQueryParams }: { customQueryParams: string }) =>
          usePredictMarketData({
            category: 'hot',
            customQueryParams,
          }),
        {
          wrapper: Wrapper,
          initialProps: { customQueryParams: 'tag_id=149' },
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarkets).toHaveBeenCalledTimes(1);

      rerender({ customQueryParams: 'tag_id=200' });

      await waitFor(() => {
        expect(mockGetMarkets).toHaveBeenCalledTimes(2);
      });

      expect(mockGetMarkets).toHaveBeenLastCalledWith(
        expect.objectContaining({
          customQueryParams: 'tag_id=200',
        }),
      );
    });
  });

  describe('pagination', () => {
    it('loads next page via fetchMore', async () => {
      const { Wrapper } = createWrapper();
      const PAGE_SIZE = 20;

      // Generate first page: 20 items (full page, so hasMore = true)
      const firstPage: PredictMarket[] = Array.from(
        { length: PAGE_SIZE },
        (_, i) => ({
          ...mockMarketData[0],
          id: `page1-market-${i}`,
          slug: `page1-market-${i}`,
          title: `Page 1 Market ${i}`,
        }),
      );

      // Generate second page: fewer than 20 items (partial page)
      const secondPage: PredictMarket[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockMarketData[0],
        id: `page2-market-${i}`,
        slug: `page2-market-${i}`,
        title: `Page 2 Market ${i}`,
      }));

      mockGetMarkets
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const { result } = renderHook(() => usePredictMarketData(), {
        wrapper: Wrapper,
      });

      // Wait for first page to load
      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.marketData).toHaveLength(PAGE_SIZE);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isFetchingMore).toBe(false);
      expect(mockGetMarkets).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0, limit: PAGE_SIZE }),
      );

      // Fetch second page
      await act(async () => {
        await result.current.fetchMore();
      });

      // Wait for all items from both pages to be present
      await waitFor(() => {
        expect(result.current.marketData).toHaveLength(PAGE_SIZE + 5);
      });

      expect(result.current.isFetchingMore).toBe(false);

      // Second call should use offset = 20 (total items from first page)
      expect(mockGetMarkets).toHaveBeenCalledTimes(2);
      expect(mockGetMarkets).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: PAGE_SIZE, limit: PAGE_SIZE }),
      );
    });

    it('sets hasMore to false on partial page', async () => {
      const { Wrapper } = createWrapper();
      const PAGE_SIZE = 20;

      // Generate first page: 20 items (full page, so hasMore = true)
      const firstPage: PredictMarket[] = Array.from(
        { length: PAGE_SIZE },
        (_, i) => ({
          ...mockMarketData[0],
          id: `page1-market-${i}`,
          slug: `page1-market-${i}`,
          title: `Page 1 Market ${i}`,
        }),
      );

      // Generate second page: fewer than 20 items (partial page, so hasMore = false)
      const secondPage: PredictMarket[] = Array.from({ length: 5 }, (_, i) => ({
        ...mockMarketData[0],
        id: `page2-market-${i}`,
        slug: `page2-market-${i}`,
        title: `Page 2 Market ${i}`,
      }));

      mockGetMarkets
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const { result } = renderHook(() => usePredictMarketData(), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Fetch second page (partial)
      await act(async () => {
        await result.current.fetchMore();
      });

      await waitFor(() => {
        expect(result.current.marketData).toHaveLength(PAGE_SIZE + 5);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });
});
