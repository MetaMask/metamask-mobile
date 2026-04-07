import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictSeries } from './usePredictSeries';
import { predictMarketKeys } from '../queries/market';
import { predictSeriesKeys } from '../queries/series';
import { Recurrence, type GetSeriesParams, type PredictMarket } from '../types';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

const mockGetMarketSeries = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarketSeries: (...args: unknown[]) => mockGetMarketSeries(...args),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: Infinity,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

const createMockMarket = (id: string): PredictMarket =>
  ({
    id,
    title: `Market ${id}`,
    slug: `market-${id}`,
    providerId: 'polymarket',
    description: `Description for ${id}`,
    image: `https://example.com/${id}.png`,
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: [],
    outcomes: [],
    liquidity: 100,
    volume: 200,
  }) as PredictMarket;

describe('usePredictSeries', () => {
  const params: GetSeriesParams = {
    seriesId: 'series-1',
    endDateMin: '2026-01-01T00:00:00.000Z',
    endDateMax: '2026-12-31T23:59:59.999Z',
    limit: 3,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns series events', async () => {
    const { Wrapper } = createWrapper();
    const marketA = createMockMarket('market-a');
    const marketB = createMockMarket('market-b');
    const marketC = createMockMarket('market-c');
    mockGetMarketSeries.mockResolvedValue([marketA, marketB, marketC]);

    const { result } = renderHook(() => usePredictSeries(params), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toEqual([marketA, marketB, marketC]);
    expect(mockGetMarketSeries).toHaveBeenCalledWith(params);
  });

  it('seeds individual market cache entries', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const marketA = createMockMarket('market-a');
    const marketB = createMockMarket('market-b');
    const marketC = createMockMarket('market-c');
    mockGetMarketSeries.mockResolvedValue([marketA, marketB, marketC]);

    renderHook(() => usePredictSeries(params), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(predictMarketKeys.detail(marketA.id)),
      ).toEqual(marketA);
    });

    expect(queryClient.getQueryData(['predict', 'market', marketA.id])).toEqual(
      marketA,
    );
  });

  it('registers query under correct cache key', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const marketA = createMockMarket('market-a');
    const marketB = createMockMarket('market-b');
    const marketC = createMockMarket('market-c');
    const seriesEvents = [marketA, marketB, marketC];
    mockGetMarketSeries.mockResolvedValue(seriesEvents);

    renderHook(() => usePredictSeries(params), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryData(predictSeriesKeys.detail(params)),
      ).toEqual(seriesEvents);
    });

    expect(
      queryClient.getQueryData([
        'predict',
        'series',
        params.seriesId,
        params.endDateMin,
        params.endDateMax,
        params.limit,
      ]),
    ).toEqual(seriesEvents);
  });
});
