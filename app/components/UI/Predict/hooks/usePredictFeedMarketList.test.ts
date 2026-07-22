import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictFeedMarketList } from './usePredictFeedMarketList';
import type { PredictMarket, PredictMarketListResponse } from '../types';

const mockListMarkets = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      listMarkets: (...args: unknown[]) => mockListMarkets(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

jest.mock('../utils/marketStaleness', () => ({
  getVisiblePredictMarkets: (markets: unknown) => markets,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper };
};

const createMarket = (id: string): PredictMarket =>
  ({ id, parentMarketId: undefined }) as unknown as PredictMarket;

const createChildMarket = (id: string): PredictMarket =>
  ({ id, parentMarketId: 'parent-1' }) as unknown as PredictMarket;

const createPage = (
  ids: string[],
  nextCursor: string | null = null,
): PredictMarketListResponse => ({
  markets: ids.map(createMarket),
  nextCursor,
});

const createChildPage = (
  ids: string[],
  nextCursor: string | null = null,
): PredictMarketListResponse => ({
  markets: ids.map(createChildMarket),
  nextCursor,
});

describe('usePredictFeedMarketList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListMarkets.mockResolvedValue(createPage([]));
  });

  it('fetches only regular markets when live-first is disabled', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockResolvedValueOnce(createPage(['regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'], order: 'start_time' },
          { showLiveFirst: false },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.markets.map((market) => market.id)).toEqual([
        'regular-1',
      ]);
    });

    expect(mockListMarkets).toHaveBeenCalledTimes(1);
    expect(mockListMarkets).toHaveBeenCalledWith({
      tagSlugs: ['sports'],
      order: 'start_time',
      afterCursor: null,
    });
  });

  it('does not fetch when disabled', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'] },
          { enabled: false, showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListMarkets).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.markets).toEqual([]);
  });

  it('adds live true to structured params before fetching regular params', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage([]))
      .mockResolvedValueOnce(createPage(['regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          {
            tagSlugs: ['soccer'],
            tags: ['100639'],
            status: 'open',
            order: 'start_time',
            startTimeMinMinutesAgo: 180,
          },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.markets.map((market) => market.id)).toEqual([
        'regular-1',
      ]);
    });

    expect(mockListMarkets).toHaveBeenNthCalledWith(1, {
      tagSlugs: ['soccer'],
      tags: ['100639'],
      status: 'open',
      order: 'volume24hr',
      startTimeMinMinutesAgo: 180,
      live: true,
      afterCursor: null,
    });
    expect(mockListMarkets).toHaveBeenNthCalledWith(2, {
      tagSlugs: ['soccer'],
      tags: ['100639'],
      status: 'open',
      order: 'start_time',
      startTimeMinMinutesAgo: 180,
      afterCursor: null,
    });
  });

  it('normalizes live in raw query params for both phases', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage([]))
      .mockResolvedValueOnce(createPage(['regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          {
            queryParams: '?tag_slug=sports&live=false&order=startTime',
          },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.markets.map((market) => market.id)).toEqual([
        'regular-1',
      ]);
    });

    expect(mockListMarkets).toHaveBeenNthCalledWith(1, {
      queryParams: 'tag_slug=sports&live=true&order=volume24hr&ascending=false',
      live: true,
      afterCursor: null,
    });
    expect(mockListMarkets).toHaveBeenNthCalledWith(2, {
      queryParams: 'tag_slug=sports&order=startTime',
      afterCursor: null,
    });
  });

  it('paginates live markets before starting the regular phase', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage(['live-1'], 'cursor-1'))
      .mockResolvedValueOnce(createPage(['live-2']))
      .mockResolvedValueOnce(createPage(['regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'], tags: ['100639'] },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });
    expect(mockListMarkets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(mockListMarkets).toHaveBeenCalledTimes(3);
    });

    expect(mockListMarkets).toHaveBeenNthCalledWith(2, {
      tagSlugs: ['sports'],
      tags: ['100639'],
      order: 'volume24hr',
      live: true,
      afterCursor: 'cursor-1',
    });
    expect(mockListMarkets).toHaveBeenNthCalledWith(3, {
      tagSlugs: ['sports'],
      tags: ['100639'],
      afterCursor: null,
    });
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'live-1',
      'live-2',
      'regular-1',
    ]);
  });

  it('dedupes duplicate markets across live and regular phases', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createPage(['shared', 'live-1']))
      .mockResolvedValueOnce(createPage(['shared', 'regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'] },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.markets.map((market) => market.id)).toEqual([
        'shared',
        'live-1',
        'regular-1',
      ]);
    });
  });

  it('auto-fetches child-only live pages before regular handoff', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets
      .mockResolvedValueOnce(createChildPage(['child-1'], 'cursor-1'))
      .mockResolvedValueOnce(createPage(['live-1']))
      .mockResolvedValueOnce(createPage(['regular-1']));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'] },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockListMarkets).toHaveBeenCalledTimes(3);
    });

    expect(mockListMarkets).toHaveBeenNthCalledWith(2, {
      tagSlugs: ['sports'],
      order: 'volume24hr',
      live: true,
      afterCursor: 'cursor-1',
    });
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'live-1',
      'regular-1',
    ]);
  });

  it('surfaces live errors without fetching regular markets', async () => {
    const { Wrapper } = createWrapper();
    mockListMarkets.mockRejectedValueOnce(new Error('Live failed'));

    const { result } = renderHook(
      () =>
        usePredictFeedMarketList(
          { tagSlugs: ['sports'] },
          { showLiveFirst: true },
        ),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.error?.message).toBe('Live failed');
    expect(mockListMarkets).toHaveBeenCalledTimes(1);
  });
});
