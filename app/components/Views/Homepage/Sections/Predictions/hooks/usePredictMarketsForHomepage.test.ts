import { renderHook, waitFor } from '@testing-library/react-native';
import { usePredictMarketData } from '../../../../../UI/Predict/hooks/usePredictMarketData';
import { usePredictMarketsForHomepage } from './usePredictMarketsForHomepage';
import type { PredictMarket } from '../../../../../UI/Predict/types';

jest.mock('../../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(),
}));

const mockUsePredictMarketData = usePredictMarketData as jest.Mock;

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
  const mockRefetch = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue({
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
    });
  });

  it('fetches trending markets with the requested page size', async () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'trending',
      pageSize: 5,
      enabled: true,
    });
    await waitFor(() => {
      expect(result.current.markets).toHaveLength(3);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('forwards enabled: false to usePredictMarketData', () => {
    renderHook(() => usePredictMarketsForHomepage(5, { enabled: false }));

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'trending',
      pageSize: 5,
      enabled: false,
    });
  });

  it('forwards isFetching as isLoading', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: true,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: mockRefetch,
      fetchMore: jest.fn(),
    });

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.isLoading).toBe(true);
  });

  it('forwards error from usePredictMarketData', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: 'Network error',
      hasMore: false,
      refetch: mockRefetch,
      fetchMore: jest.fn(),
    });

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.error).toBe('Network error');
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
