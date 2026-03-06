import { renderHook } from '@testing-library/react-native';
import { usePredictMarketsForHomepage } from './usePredictMarketsForHomepage';
import type { PredictMarket } from '../../../../../UI/Predict/types';

const mockRefetch = jest.fn().mockResolvedValue(undefined);
let mockUsePredictMarketDataReturn: {
  marketData: PredictMarket[];
  isFetching: boolean;
  isFetchingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  refetch: jest.Mock;
  fetchMore: jest.Mock;
} = {
  marketData: [],
  isFetching: false,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: mockRefetch,
  fetchMore: jest.fn(),
};

jest.mock('../../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: () => mockUsePredictMarketDataReturn,
}));

const createMockMarket = (id: string): PredictMarket =>
  ({
    id,
    title: `Market ${id}`,
    endDate: '2026-06-01',
    outcomes: [
      {
        id: `outcome-${id}`,
        title: 'Yes',
        tokens: [{ title: 'Yes', price: 0.55 }],
      },
    ],
  }) as unknown as PredictMarket;

describe('usePredictMarketsForHomepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketDataReturn = {
      marketData: [
        createMockMarket('1'),
        createMockMarket('2'),
        createMockMarket('3'),
      ],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: mockRefetch,
      fetchMore: jest.fn(),
    };
  });

  it('returns markets from usePredictMarketData', () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.markets).toHaveLength(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('forwards isFetching as isLoading', () => {
    mockUsePredictMarketDataReturn.isFetching = true;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.isLoading).toBe(true);
  });

  it('forwards error from usePredictMarketData', () => {
    const err = new Error('Network error');
    mockUsePredictMarketDataReturn.error = err;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.error).toBe(err);
  });

  it('returns null error when no error', () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.error).toBeNull();
  });

  it('exposes refetch from usePredictMarketData', async () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    await result.current.refetch();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
