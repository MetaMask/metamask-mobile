import { renderHook } from '@testing-library/react-native';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import type { PredictMarket } from '../../../../types';
import {
  usePredictTrendingSection,
  TRENDING_DISPLAY_LIMIT,
} from './usePredictTrendingSection';

jest.mock('../../../../hooks/usePredictMarketList');

const mockUsePredictMarketList = usePredictMarketList as jest.Mock;

const createMarket = (id: string): PredictMarket =>
  ({ id }) as unknown as PredictMarket;

const setMarketList = (
  overrides: Partial<{
    markets: PredictMarket[];
    isLoading: boolean;
    error: Error | null;
  }> = {},
) => {
  mockUsePredictMarketList.mockReturnValue({
    markets: [],
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    error: null,
    hasNextPage: false,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    ...overrides,
  });
};

describe('usePredictTrendingSection', () => {
  beforeEach(() => {
    setMarketList();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('queries markets with params sourced from the feed registry (order, status, limit)', () => {
    renderHook(() => usePredictTrendingSection());

    expect(mockUsePredictMarketList).toHaveBeenCalledWith(
      expect.objectContaining({
        order: 'volume24hr',
        status: 'open',
        limit: TRENDING_DISPLAY_LIMIT,
      }),
    );
  });

  it('returns the markets from usePredictMarketList directly', () => {
    const markets = [createMarket('a'), createMarket('b')];
    setMarketList({ markets });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.markets).toHaveLength(2);
    expect(result.current.showEmptyState).toBe(false);
  });

  it('passes through the loading state and does not show empty state while loading', () => {
    setMarketList({ markets: [], isLoading: true });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.showEmptyState).toBe(false);
  });

  it('shows empty state when no markets are returned after load', () => {
    setMarketList({ markets: [], isLoading: false });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.showEmptyState).toBe(true);
    expect(result.current.markets).toHaveLength(0);
  });

  it('caps returned markets to TRENDING_DISPLAY_LIMIT even when the cache holds more', () => {
    const markets = Array.from({ length: 12 }, (_, i) =>
      createMarket(`m-${i}`),
    );
    setMarketList({ markets });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.markets).toHaveLength(TRENDING_DISPLAY_LIMIT);
  });

  it('shows empty state when the fetch returns an error', () => {
    setMarketList({
      markets: [],
      isLoading: false,
      error: new Error('network'),
    });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.showEmptyState).toBe(true);
  });
});
