import { renderHook } from '@testing-library/react-native';
import { usePredictMarketList } from '../../../../hooks/usePredictMarketList';
import type { PredictMarket } from '../../../../types';
import {
  usePredictTrendingSection,
  TRENDING_DISPLAY_LIMIT,
  TRENDING_FETCH_LIMIT,
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

  it('queries markets ordered by 24h volume with the v1 params', () => {
    renderHook(() => usePredictTrendingSection());

    expect(mockUsePredictMarketList).toHaveBeenCalledWith({
      order: 'volume24hr',
      status: 'open',
      limit: TRENDING_FETCH_LIMIT,
    });
  });

  it('caps the displayed markets to the display limit', () => {
    const markets = Array.from({ length: TRENDING_FETCH_LIMIT }, (_, index) =>
      createMarket(`m-${index}`),
    );
    setMarketList({ markets });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.markets).toHaveLength(TRENDING_DISPLAY_LIMIT);
    expect(result.current.markets[0].id).toBe('m-0');
    expect(result.current.markets[TRENDING_DISPLAY_LIMIT - 1].id).toBe(
      `m-${TRENDING_DISPLAY_LIMIT - 1}`,
    );
  });

  it('returns all markets when fewer than the display limit', () => {
    setMarketList({ markets: [createMarket('a'), createMarket('b')] });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.markets).toHaveLength(2);
    expect(result.current.isUnavailable).toBe(false);
  });

  it('passes through the loading state and is not unavailable while loading', () => {
    setMarketList({ markets: [], isLoading: true });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isUnavailable).toBe(false);
  });

  it('is unavailable when no markets are returned after load', () => {
    setMarketList({ markets: [], isLoading: false });

    const { result } = renderHook(() => usePredictTrendingSection());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isUnavailable).toBe(true);
    expect(result.current.markets).toHaveLength(0);
  });
});
