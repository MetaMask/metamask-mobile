import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictMarketData } from '../../../../../UI/Predict/hooks/usePredictMarketData';
import type { PredictMarket } from '../../../../../UI/Predict/types';
import {
  useHomepagePredictLiveWorldCupMarkets,
  useHomepagePredictWorldCupEventCount,
  useHomepagePredictWorldCupMarkets,
} from './useHomepagePredictWorldCupMarkets';

jest.mock('../../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

const mockUsePredictMarketData = jest.mocked(usePredictMarketData);
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockMarketDataResult = {
  marketData: [{ id: 'market-1' }] as PredictMarket[],
  isFetching: false,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { cacheTime: Infinity, retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useHomepagePredictWorldCupMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue(mockMarketDataResult);
  });

  it('fetches the homepage World Cup event count', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        pagination: { totalResults: 48 },
      }),
    });

    const { result } = renderHook(
      () => useHomepagePredictWorldCupEventCount({ enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.eventCount).toBe(48));

    expect(mockFetch).toHaveBeenCalledWith(
      'https://gamma-api.polymarket.com/events/pagination?tag_slug=fifa-world-cup&limit=1&active=true&closed=false&archived=false',
    );
  });

  it('omits the event count when pagination metadata is missing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        pagination: {},
      }),
    });

    const { result } = renderHook(
      () => useHomepagePredictWorldCupEventCount({ enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.eventCount).toBeUndefined();
  });

  it('omits the event count when pagination totalResults is not a number', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        pagination: { totalResults: '48' },
      }),
    });

    const { result } = renderHook(
      () => useHomepagePredictWorldCupEventCount({ enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.eventCount).toBeUndefined();
  });

  it('keeps the event count empty while the request is loading', () => {
    mockFetch.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(
      () => useHomepagePredictWorldCupEventCount({ enabled: true }),
      { wrapper: createWrapper() },
    );

    expect(result.current.eventCount).toBeUndefined();
    expect(result.current.isFetching).toBe(true);
  });

  it('does not request the event count when the homepage query is disabled', () => {
    renderHook(() => useHomepagePredictWorldCupEventCount({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads homepage World Cup markets with homepage-owned query parameters', () => {
    renderHook(() => useHomepagePredictWorldCupMarkets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr&ascending=false',
      refine: expect.any(Function),
      enabled: true,
    });
  });

  it('loads live World Cup markets with the live query parameter', () => {
    renderHook(() => useHomepagePredictLiveWorldCupMarkets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&tag_id=100639&live=true&order=startDate',
      refine: expect.any(Function),
      enabled: true,
    });
  });

  it('normalizes homepage World Cup markets to the sports category', () => {
    renderHook(() => useHomepagePredictWorldCupMarkets({ enabled: true }), {
      wrapper: createWrapper(),
    });
    const options = mockUsePredictMarketData.mock.calls[0][0];
    const market = {
      id: 'world-cup-market',
      category: 'hot',
    } as PredictMarket;

    const result = options?.refine?.([market]);

    expect(result?.[0]).toEqual(
      expect.objectContaining({ id: 'world-cup-market', category: 'sports' }),
    );
  });
});
