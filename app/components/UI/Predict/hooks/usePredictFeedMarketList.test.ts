import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePredictFeedMarketList } from './usePredictFeedMarketList';
import {
  usePredictMarketList,
  type UsePredictMarketListResult,
} from './usePredictMarketList';
import { createMarket } from '../testUtils/marketList';
import { deduplicateSeriesMarkets } from '../utils/feed';
import type { PredictMarket } from '../types';

jest.mock('./usePredictMarketList');

const mockUsePredictMarketList = jest.mocked(usePredictMarketList);

const createMarketListResult = (
  overrides: Partial<UsePredictMarketListResult> = {},
): UsePredictMarketListResult => ({
  markets: [],
  isLoading: false,
  isFetching: false,
  isFetchingNextPage: false,
  error: null,
  hasNextPage: false,
  refetch: jest.fn().mockResolvedValue(undefined),
  fetchNextPage: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createPendingPromise = (): Promise<unknown> =>
  new Promise<unknown>(() => {
    // Keep auto-advance in flight for assertions that inspect loading state.
  });

describe('usePredictFeedMarketList', () => {
  let liveResult: UsePredictMarketListResult;
  let regularResult: UsePredictMarketListResult;

  beforeEach(() => {
    jest.clearAllMocks();
    liveResult = createMarketListResult();
    regularResult = createMarketListResult();
    mockUsePredictMarketList.mockImplementation((params = {}) =>
      params.live === true ? liveResult : regularResult,
    );
  });

  it('returns the regular phase when live-first is disabled', () => {
    regularResult = createMarketListResult({
      markets: [createMarket('regular-1')],
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'], order: 'start_time' },
        { showLiveFirst: false },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      1,
      {
        tagSlugs: ['sports'],
        order: 'volume24hr',
        live: true,
      },
      { enabled: false, filterStaleGameMarkets: false },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      {
        tagSlugs: ['sports'],
        order: 'start_time',
      },
      { enabled: true, filterStaleGameMarkets: false },
    );
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'regular-1',
    ]);
  });

  it('preserves live filter params when live-first is disabled', () => {
    renderHook(() =>
      usePredictFeedMarketList(
        { live: true, order: 'volume24hr', limit: 10 },
        { showLiveFirst: false },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { live: true, order: 'volume24hr', limit: 10 },
      { enabled: true, filterStaleGameMarkets: false },
    );
  });

  it('leaves raw query mutation to the provider query builder', () => {
    const queryParams = 'tag_slug=sports&live=false&order=startTime';

    renderHook(() =>
      usePredictFeedMarketList({ queryParams }, { showLiveFirst: true }),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      1,
      { queryParams, live: true },
      { enabled: true, filterStaleGameMarkets: false },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { queryParams, live: false },
      { enabled: true, filterStaleGameMarkets: false },
    );
  });

  it('passes stale game filtering to both phases when enabled', () => {
    renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true, filterStaleGameMarkets: true },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      1,
      { tagSlugs: ['sports'], live: true, order: 'volume24hr' },
      { enabled: true, filterStaleGameMarkets: true },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { tagSlugs: ['sports'] },
      { enabled: true, filterStaleGameMarkets: true },
    );
  });

  it('passes filterByVolume to both phases when set', () => {
    renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        {
          showLiveFirst: true,
          filterStaleGameMarkets: true,
          filterByVolume: 1000,
        },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      1,
      { tagSlugs: ['sports'], live: true, order: 'volume24hr' },
      {
        enabled: true,
        filterStaleGameMarkets: true,
        filterByVolume: 1000,
      },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { tagSlugs: ['sports'] },
      {
        enabled: true,
        filterStaleGameMarkets: true,
        filterByVolume: 1000,
      },
    );
  });

  it('enables the regular phase after live markets are exhausted', () => {
    liveResult = createMarketListResult({
      markets: [createMarket('shared'), createMarket('live-1')],
    });
    regularResult = createMarketListResult({
      markets: [createMarket('shared'), createMarket('regular-1')],
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { tagSlugs: ['sports'] },
      { enabled: true, filterStaleGameMarkets: false },
    );
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'shared',
      'live-1',
      'regular-1',
    ]);
  });

  it('routes pagination to the active phase', async () => {
    const liveFetchNextPage = jest.fn().mockResolvedValue(undefined);
    const regularFetchNextPage = jest.fn().mockResolvedValue(undefined);
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: liveFetchNextPage,
    });
    regularResult = createMarketListResult({
      fetchNextPage: regularFetchNextPage,
    });
    const { result, rerender } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true },
      ),
    );

    await act(async () => {
      await result.current.fetchNextPage();
    });
    liveResult = createMarketListResult({ hasNextPage: false });
    rerender({});
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(liveFetchNextPage).toHaveBeenCalledTimes(1);
    expect(regularFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('refetches both phases after the live phase is exhausted', async () => {
    const liveRefetch = jest.fn().mockResolvedValue(undefined);
    const regularRefetch = jest.fn().mockResolvedValue(undefined);
    liveResult = createMarketListResult({ refetch: liveRefetch });
    regularResult = createMarketListResult({ refetch: regularRefetch });
    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true },
      ),
    );

    await act(async () => {
      await result.current.refetch();
    });

    expect(liveRefetch).toHaveBeenCalledTimes(1);
    expect(regularRefetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces live errors without enabling regular markets', () => {
    const error = new Error('Live failed');
    liveResult = createMarketListResult({ error });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true },
      ),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { tagSlugs: ['sports'] },
      { enabled: false, filterStaleGameMarkets: false },
    );
    expect(result.current.error).toBe(error);
  });

  it('does not auto-advance empty pages unless the sports policy is enabled', async () => {
    const liveFetchNextPage = jest.fn().mockResolvedValue(undefined);
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: liveFetchNextPage,
    });

    renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true },
      ),
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(liveFetchNextPage).not.toHaveBeenCalled();
  });

  it('auto-advances an empty live page until visible sports markets appear', async () => {
    const liveFetchNextPage = jest.fn().mockImplementation(async () => {
      liveResult = createMarketListResult({
        markets: [createMarket('live-1')],
        fetchNextPage: liveFetchNextPage,
      });
    });
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: liveFetchNextPage,
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true, autoAdvanceEmptyPages: true },
      ),
    );

    await waitFor(() => {
      expect(result.current.markets.map((market) => market.id)).toEqual([
        'live-1',
      ]);
    });
    expect(liveFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('enables regular markets when empty live pages reach the sports budget', async () => {
    const liveFetchNextPage = jest.fn().mockResolvedValue(undefined);
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: liveFetchNextPage,
    });
    regularResult = createMarketListResult({
      markets: [createMarket('regular-1')],
    });
    mockUsePredictMarketList.mockImplementation((params = {}, options = {}) => {
      if (options.enabled === false) {
        return createMarketListResult();
      }
      return params.live === true ? liveResult : regularResult;
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true, autoAdvanceEmptyPages: true },
      ),
    );

    await waitFor(() => {
      expect(liveFetchNextPage).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(mockUsePredictMarketList).toHaveBeenCalledWith(
        { tagSlugs: ['sports'] },
        { enabled: true, filterStaleGameMarkets: false },
      );
    });
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'regular-1',
    ]);
  });

  it('auto-advances regular sports pages with the same bounded policy', async () => {
    const regularFetchNextPage = jest.fn().mockResolvedValue(undefined);
    regularResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: regularFetchNextPage,
    });

    renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'], excludedTags: ['100639'] },
        { showLiveFirst: false, autoAdvanceEmptyPages: true },
      ),
    );

    await waitFor(() => {
      expect(regularFetchNextPage).toHaveBeenCalledTimes(3);
    });
  });

  it('keeps loading while an empty regular page can auto-advance', () => {
    regularResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: jest.fn(createPendingPromise),
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'], excludedTags: ['100639'] },
        { showLiveFirst: false, autoAdvanceEmptyPages: true },
      ),
    );

    expect(result.current.markets).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('keeps loading while an empty live page can auto-advance', () => {
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: jest.fn(createPendingPromise),
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['sports'] },
        { showLiveFirst: true, autoAdvanceEmptyPages: true },
      ),
    );

    expect(result.current.markets).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it('resets the empty-page budget when the feed params change', async () => {
    const liveFetchNextPage = jest.fn().mockResolvedValue(undefined);
    liveResult = createMarketListResult({
      hasNextPage: true,
      fetchNextPage: liveFetchNextPage,
    });

    const { rerender } = renderHook(
      ({ tagSlugs }: { tagSlugs: string[] }) =>
        usePredictFeedMarketList(
          { tagSlugs },
          { showLiveFirst: true, autoAdvanceEmptyPages: true },
        ),
      { initialProps: { tagSlugs: ['soccer'] } },
    );

    await waitFor(() => {
      expect(liveFetchNextPage).toHaveBeenCalledTimes(3);
    });

    rerender({ tagSlugs: ['basketball'] });

    await waitFor(() => {
      expect(liveFetchNextPage).toHaveBeenCalledTimes(6);
    });
  });

  it('applies refine across paginated pages so Gold and Silver 15m collapse to one nearest-ending card each', async () => {
    const createMetalWindow = (
      id: string,
      assetTag: 'gold' | 'silver',
      seriesId: string,
      seriesSlug: string,
      endDate: string,
    ): PredictMarket => ({
      ...createMarket(id),
      endDate,
      series: {
        id: seriesId,
        slug: seriesSlug,
        title:
          assetTag === 'gold' ? 'Gold Up or Down 15m' : 'Silver Up or Down 15m',
        recurrence: '15m',
      },
      tags: [assetTag, 'up-or-down'],
    });

    const gold1 = createMetalWindow(
      'xau-1515',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:15:00Z',
    );
    const gold2 = createMetalWindow(
      'xau-1530',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:30:00Z',
    );
    const gold3 = createMetalWindow(
      'xau-1545',
      'gold',
      '12967',
      'gold-up-or-down-15m',
      '2026-11-23T15:45:00Z',
    );
    const silver1 = createMetalWindow(
      'xag-1515',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:15:00Z',
    );
    const silver2 = createMetalWindow(
      'xag-1530',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:30:00Z',
    );
    const silver3 = createMetalWindow(
      'xag-1545',
      'silver',
      '12968',
      'silver-up-or-down-15m',
      '2026-11-23T15:45:00Z',
    );
    const unrelated1 = { ...createMarket('fed-rates'), tags: ['finance'] };
    const unrelated2 = { ...createMarket('sp500-close'), tags: ['finance'] };

    const page1 = [gold1, unrelated1, silver1, gold2, silver2];
    const page2 = [gold3, unrelated2, silver3];

    const regularFetchNextPage = jest.fn().mockImplementation(async () => {
      regularResult = createMarketListResult({
        markets: [...page1, ...page2],
        hasNextPage: false,
        fetchNextPage: regularFetchNextPage,
      });
    });

    regularResult = createMarketListResult({
      markets: page1,
      hasNextPage: true,
      fetchNextPage: regularFetchNextPage,
    });

    const { result, rerender } = renderHook(() =>
      usePredictFeedMarketList(
        { series: ['12967', '12968'], status: 'open', order: 'ending_soon' },
        { showLiveFirst: false, refine: deduplicateSeriesMarkets },
      ),
    );

    expect(result.current.markets.map((market) => market.id)).toEqual([
      'xau-1515',
      'fed-rates',
      'xag-1515',
    ]);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    rerender({});

    expect(result.current.markets.map((market) => market.id)).toEqual([
      'xau-1515',
      'fed-rates',
      'xag-1515',
      'sp500-close',
    ]);
  });

  it('applies refine across live and regular phases when live-first is enabled', () => {
    const goldLive: PredictMarket = {
      ...createMarket('xau-live'),
      series: {
        id: '12967',
        slug: 'gold-up-or-down-15m',
        title: 'Gold Up or Down 15m',
        recurrence: '15m',
      },
      tags: ['gold', 'up-or-down'],
    };
    const goldNext: PredictMarket = {
      ...createMarket('xau-next'),
      series: {
        id: '12967',
        slug: 'gold-up-or-down-15m',
        title: 'Gold Up or Down 15m',
        recurrence: '15m',
      },
      tags: ['gold', 'up-or-down'],
    };
    const regularMarket = { ...createMarket('regular-1'), tags: ['finance'] };

    liveResult = createMarketListResult({ markets: [goldLive] });
    regularResult = createMarketListResult({
      markets: [goldNext, regularMarket],
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { tagSlugs: ['finance'] },
        { showLiveFirst: true, refine: deduplicateSeriesMarkets },
      ),
    );

    expect(result.current.markets.map((market) => market.id)).toEqual([
      'xau-live',
      'regular-1',
    ]);
  });

  it('orders silver-first API results gold-first when refine passes series order', () => {
    const silver1: PredictMarket = {
      ...createMarket('xag-1515'),
      series: {
        id: '12968',
        slug: 'silver-up-or-down-15m',
        title: 'Silver Up or Down 15m',
        recurrence: '15m',
      },
      tags: ['silver', 'up-or-down'],
    };
    const silver2: PredictMarket = {
      ...createMarket('xag-1530'),
      series: {
        id: '12968',
        slug: 'silver-up-or-down-15m',
        title: 'Silver Up or Down 15m',
        recurrence: '15m',
      },
      tags: ['silver', 'up-or-down'],
    };
    const gold1: PredictMarket = {
      ...createMarket('xau-1515'),
      series: {
        id: '12967',
        slug: 'gold-up-or-down-15m',
        title: 'Gold Up or Down 15m',
        recurrence: '15m',
      },
      tags: ['gold', 'up-or-down'],
    };
    const unrelated1 = { ...createMarket('fed-rates'), tags: ['finance'] };
    const unrelated2 = { ...createMarket('sp500-close'), tags: ['finance'] };

    regularResult = createMarketListResult({
      markets: [unrelated1, silver1, silver2, gold1, unrelated2],
    });

    const { result } = renderHook(() =>
      usePredictFeedMarketList(
        { series: ['12967', '12968'], status: 'open', order: 'ending_soon' },
        {
          showLiveFirst: false,
          refine: (markets) =>
            deduplicateSeriesMarkets(markets, ['12967', '12968']),
        },
      ),
    );

    expect(result.current.markets.map((market) => market.id)).toEqual([
      'fed-rates',
      'xau-1515',
      'xag-1515',
      'sp500-close',
    ]);
  });
});
