import { renderHook } from '@testing-library/react-hooks';
import { usePredictActivityItems } from './usePredictActivityItems';
import { usePredictActivity } from '../../../UI/Predict/hooks/usePredictActivity';
import type { PredictActivity } from '../../../UI/Predict/types';

jest.mock('../../../UI/Predict/hooks/usePredictActivity', () => ({
  usePredictActivity: jest.fn(),
}));

const buyActivity: PredictActivity = {
  id: 'predict-buy',
  providerId: 'polymarket',
  title: 'Will it rain?',
  outcome: 'Yes',
  entry: {
    type: 'buy',
    timestamp: 200,
    marketId: 'm1',
    outcomeId: 'o1',
    outcomeTokenId: 1,
    amount: 100,
    price: 0.42,
  },
};

const claimActivity: PredictActivity = {
  id: 'predict-claim',
  providerId: 'polymarket',
  entry: { type: 'claimWinnings', timestamp: 100, amount: 250 },
};

const setActivity = (
  activity: PredictActivity[],
  overrides: Partial<ReturnType<typeof usePredictActivity>> = {},
) => {
  (usePredictActivity as jest.Mock).mockReturnValue({
    activity,
    data: activity,
    isLoading: false,
    error: null,
    refetch: jest.fn(() => Promise.resolve()),
    ...overrides,
  });
};

describe('usePredictActivityItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setActivity([]);
  });

  it('maps predict activity onto the Polygon activity chainId', () => {
    setActivity([buyActivity, claimActivity]);

    const { result } = renderHook(() => usePredictActivityItems());

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.every((i) => i.chainId === 'eip155:137')).toBe(
      true,
    );
  });

  it('maps a buy to predictionPlaced with out-direction USDC', () => {
    setActivity([buyActivity]);

    const { result } = renderHook(() => usePredictActivityItems());

    expect(result.current.items[0]).toEqual({
      type: 'predictionPlaced',
      chainId: 'eip155:137',
      status: 'success',
      timestamp: 200_000, // entry.timestamp (200s) → ms
      raw: { type: 'predictActivity', data: buyActivity },
      hash: 'predict-buy',
      data: {
        token: {
          amount: '100',
          symbol: 'USDC',
          assetId: undefined,
          direction: 'out',
        },
      },
    });
  });

  it('maps a claim to predictionClaimWinnings with in-direction', () => {
    setActivity([claimActivity]);

    const { result } = renderHook(() => usePredictActivityItems());

    expect(result.current.items[0]).toMatchObject({
      type: 'predictionClaimWinnings',
      hash: 'predict-claim',
      data: { token: { direction: 'in' } },
    });
  });

  it('surfaces the error message and loading flag', () => {
    setActivity([], { isLoading: true, error: new Error('boom') });

    const { result } = renderHook(() => usePredictActivityItems());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe('boom');
  });

  it('returns a stable refetch reference across renders', () => {
    setActivity([buyActivity]);

    const { result, rerender } = renderHook(() => usePredictActivityItems());
    const first = result.current.refetch;
    rerender();

    // Stable identity prevents PredictActivitySource's onChange effect from
    // firing every render (which would loop through the lifted-state setter).
    expect(result.current.refetch).toBe(first);
  });

  it('exposes pagination state and loadMore fetches the next page', async () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    setActivity([buyActivity], {
      fetchNextPage: fetchNextPage as unknown as ReturnType<
        typeof usePredictActivity
      >['fetchNextPage'],
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    const { result } = renderHook(() => usePredictActivityItems());

    expect(result.current.hasMore).toBe(true);
    expect(result.current.isFetchingMore).toBe(false);

    await result.current.loadMore();
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('loadMore is a no-op when there is no next page', async () => {
    const fetchNextPage = jest.fn(() => Promise.resolve());
    setActivity([buyActivity], {
      fetchNextPage: fetchNextPage as unknown as ReturnType<
        typeof usePredictActivity
      >['fetchNextPage'],
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { result } = renderHook(() => usePredictActivityItems());

    await result.current.loadMore();
    expect(fetchNextPage).not.toHaveBeenCalled();
    expect(result.current.hasMore).toBe(false);
  });
});
