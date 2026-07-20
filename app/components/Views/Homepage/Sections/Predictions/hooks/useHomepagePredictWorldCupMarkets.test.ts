import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../../../../UI/Predict/constants/flags';
import { usePredictWorldCupMarkets } from '../../../../../UI/Predict/hooks/usePredictWorldCup';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../UI/Predict/constants/worldCupTabs';
import {
  useHomepagePredictLiveWorldCupMarkets,
  useHomepagePredictWorldCupEventCount,
  useHomepagePredictWorldCupMarkets,
} from './useHomepagePredictWorldCupMarkets';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../UI/Predict/hooks/usePredictWorldCup', () => ({
  usePredictWorldCupMarkets: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUsePredictWorldCupMarkets = jest.mocked(usePredictWorldCupMarkets);
const mockFetch = jest.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useHomepagePredictWorldCupMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(DEFAULT_PREDICT_WORLD_CUP_FLAG);
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: [{ id: 'market-1' }] as never,
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
  });

  it('fetches the homepage World Cup event count using the configured World Cup tag', async () => {
    mockUseSelector.mockReturnValue({
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      tagSlug: 'remote-configured-world-cup-tag',
    });
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
      'https://gamma-api.polymarket.com/events/pagination?tag_slug=remote-configured-world-cup-tag&limit=1&active=true&closed=false&archived=false',
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

  it('does not fall back to the loaded market count while the event count is loading', () => {
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: Array.from({ length: 19 }, (_, index) => ({
        id: `market-${index}`,
      })) as never,
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
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

  it('keeps the market hook scoped to market data only', () => {
    const { result } = renderHook(
      () => useHomepagePredictWorldCupMarkets({ enabled: true }),
      { wrapper: createWrapper() },
    );

    expect(result.current).not.toHaveProperty('eventCount');
    expect(result.current).not.toHaveProperty('totalResults');
  });

  it('loads homepage World Cup markets from the all tab', () => {
    renderHook(() => useHomepagePredictWorldCupMarkets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(mockUsePredictWorldCupMarkets).toHaveBeenCalledWith({
      tabKey: PREDICT_WORLD_CUP_TAB_KEYS.ALL,
      config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
      enabled: true,
    });
  });

  it('loads homepage live World Cup markets from the live tab', () => {
    renderHook(() => useHomepagePredictLiveWorldCupMarkets({ enabled: true }), {
      wrapper: createWrapper(),
    });

    expect(mockUsePredictWorldCupMarkets).toHaveBeenCalledWith({
      tabKey: PREDICT_WORLD_CUP_TAB_KEYS.LIVE,
      config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
      enabled: true,
    });
  });
});
