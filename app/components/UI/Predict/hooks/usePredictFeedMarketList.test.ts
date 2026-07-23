import { act, renderHook } from '@testing-library/react-native';
import { usePredictFeedMarketList } from './usePredictFeedMarketList';
import {
  usePredictMarketList,
  type UsePredictMarketListResult,
} from './usePredictMarketList';
import { createMarket } from '../testUtils/marketList';

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
      { enabled: false },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      {
        tagSlugs: ['sports'],
        order: 'start_time',
      },
      { enabled: true },
    );
    expect(result.current.markets.map((market) => market.id)).toEqual([
      'regular-1',
    ]);
  });

  it('leaves raw query mutation to the provider query builder', () => {
    const queryParams = 'tag_slug=sports&live=false&order=startTime';

    renderHook(() =>
      usePredictFeedMarketList({ queryParams }, { showLiveFirst: true }),
    );

    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      1,
      { queryParams, live: true },
      { enabled: true },
    );
    expect(mockUsePredictMarketList).toHaveBeenNthCalledWith(
      2,
      { queryParams, live: false },
      { enabled: true },
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
      { enabled: true },
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
      { enabled: false },
    );
    expect(result.current.error).toBe(error);
  });
});
