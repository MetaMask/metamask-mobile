import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../constants/flags';
import { Recurrence, type PredictMarket } from '../types';
import { usePredictWorldCupMarkets } from './usePredictWorldCup';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarkets: jest.fn(),
    },
  },
}));

const mockGetMarkets = jest.mocked(Engine.context.PredictController.getMarkets);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { cacheTime: Infinity, retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const createMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: 'market-1',
  providerId: 'polymarket',
  slug: 'market-1',
  title: 'Market 1',
  description: 'Description',
  image: 'image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'hot',
  tags: [],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  ...overrides,
});

describe('usePredictWorldCupMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests All markets with a cached paginated query', async () => {
    const { Wrapper } = createWrapper();
    const allMarket = createMarket({ id: 'all-market' });
    mockGetMarkets.mockResolvedValue({
      markets: [allMarket],
      nextCursor: null,
    });

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'all',
          config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
          pageSize: 30,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.marketData).toEqual([allMarket]));

    expect(mockGetMarkets).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr&ascending=false',
      limit: 30,
      afterCursor: null,
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('requests Props markets with a cached paginated query', async () => {
    const { Wrapper } = createWrapper();
    const propsMarket = createMarket({ id: 'props-market' });
    mockGetMarkets.mockResolvedValue({
      markets: [propsMarket],
      nextCursor: null,
    });

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'props',
          config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(result.current.marketData).toEqual([propsMarket]),
    );

    expect(mockGetMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&exclude_tag_id=100639&order=volume&ascending=false',
      }),
    );
  });

  it('requests Live markets without pagination', async () => {
    const { Wrapper } = createWrapper();
    const liveMarket = createMarket({ id: 'live-market' });
    mockGetMarkets.mockResolvedValue({
      markets: [liveMarket],
      nextCursor: null,
    });

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'live',
          config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(result.current.marketData).toEqual([liveMarket]),
    );

    expect(mockGetMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&series_id=11433&tag_id=100639&live=true&order=startDate',
      }),
    );
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isFetchingMore).toBe(false);
  });

  it('requests stage markets with all configured event IDs and no pagination', async () => {
    const { Wrapper } = createWrapper();
    const stageMarket = createMarket({ id: 'stage-market' });
    const config = {
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      stages: [{ key: 'group-stage', eventIds: ['123', '456'] }],
    };
    mockGetMarkets.mockResolvedValue({
      markets: [stageMarket],
      nextCursor: null,
    });

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'group-stage',
          config,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() =>
      expect(result.current.marketData).toEqual([stageMarket]),
    );

    expect(mockGetMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&id=123&id=456',
        limit: 2,
      }),
    );
    expect(result.current.hasMore).toBe(false);
  });

  it('skips fetching for a stage without configured event IDs', () => {
    const { Wrapper } = createWrapper();
    const config = {
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      stages: [{ key: 'empty-stage', eventIds: [] }],
    };

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'empty-stage',
          config,
        }),
      { wrapper: Wrapper },
    );

    expect(result.current.marketData).toEqual([]);
    expect(mockGetMarkets).not.toHaveBeenCalled();
  });

  it('uses the returned cursor when fetching more World Cup markets', async () => {
    const { Wrapper } = createWrapper();
    const firstMarket = createMarket({ id: 'first-market' });
    const secondMarket = createMarket({ id: 'second-market' });
    mockGetMarkets
      .mockResolvedValueOnce({ markets: [firstMarket], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ markets: [secondMarket], nextCursor: null });

    const { result } = renderHook(
      () =>
        usePredictWorldCupMarkets({
          tabKey: 'all',
          config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
          pageSize: 1,
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.marketData).toEqual([firstMarket]);
    });
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.fetchMore();
    });

    expect(mockGetMarkets).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ afterCursor: 'cursor-2', limit: 1 }),
    );
    expect(result.current.marketData).toEqual([firstMarket, secondMarket]);
    expect(result.current.hasMore).toBe(false);
  });

  it('returns cached data when switching back to a previously loaded tab', async () => {
    const { Wrapper } = createWrapper();
    const allMarket = createMarket({ id: 'all-market' });
    const liveMarket = createMarket({ id: 'live-market' });
    mockGetMarkets
      .mockResolvedValueOnce({ markets: [allMarket], nextCursor: null })
      .mockResolvedValueOnce({ markets: [liveMarket], nextCursor: null });

    const { result, rerender } = renderHook(
      ({ tabKey }: { tabKey: 'all' | 'live' }) =>
        usePredictWorldCupMarkets({
          tabKey,
          config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
        }),
      { initialProps: { tabKey: 'all' }, wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.marketData).toEqual([allMarket]));

    rerender({ tabKey: 'live' });

    await waitFor(() =>
      expect(result.current.marketData).toEqual([liveMarket]),
    );

    mockGetMarkets.mockClear();
    rerender({ tabKey: 'all' });

    expect(result.current.marketData).toEqual([allMarket]);
    expect(mockGetMarkets).not.toHaveBeenCalled();
  });
});
