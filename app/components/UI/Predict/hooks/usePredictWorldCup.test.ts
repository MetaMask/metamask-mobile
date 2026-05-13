import { renderHook } from '@testing-library/react-native';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../constants/flags';
import { usePredictMarketData } from './usePredictMarketData';
import { usePredictWorldCupMarkets } from './usePredictWorldCup';

jest.mock('./usePredictMarketData', () => ({
  usePredictMarketData: jest.fn(() => ({
    marketData: [],
    isFetching: false,
    isFetchingMore: false,
    error: null,
    hasMore: false,
    refetch: jest.fn(),
    fetchMore: jest.fn(),
  })),
}));

const mockUsePredictMarketData = jest.mocked(usePredictMarketData);

describe('usePredictWorldCupMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });
  });

  it('requests All markets with pagination enabled', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: false,
      error: null,
      hasMore: true,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });

    const { result } = renderHook(() =>
      usePredictWorldCupMarkets({
        tabKey: 'all',
        config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
        pageSize: 30,
      }),
    );

    expect(mockUsePredictMarketData).toHaveBeenCalledWith({
      category: 'hot',
      customQueryParams:
        'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&order=volume24hr&ascending=false',
      pageSize: 30,
      refine: undefined,
      enabled: true,
    });
    expect(result.current.hasMore).toBe(true);
  });

  it('requests Props markets with pagination enabled', () => {
    renderHook(() =>
      usePredictWorldCupMarkets({
        tabKey: 'props',
        config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
      }),
    );

    expect(mockUsePredictMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&tag_slug=fifa-world-cup&exclude_tag_id=100639&order=volume&ascending=false',
      }),
    );
  });

  it('requests Live markets without pagination', () => {
    mockUsePredictMarketData.mockReturnValue({
      marketData: [],
      isFetching: false,
      isFetchingMore: true,
      error: null,
      hasMore: true,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
    });

    const { result } = renderHook(() =>
      usePredictWorldCupMarkets({
        tabKey: 'live',
        config: DEFAULT_PREDICT_WORLD_CUP_FLAG,
      }),
    );

    expect(mockUsePredictMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&series_id=11433&tag_id=100639&live=true&order=startDate',
      }),
    );
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isFetchingMore).toBe(false);
  });

  it('requests stage markets with all configured event IDs and no pagination', () => {
    const config = {
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      stages: [{ key: 'group-stage', eventIds: ['123', '456'] }],
    };

    const { result } = renderHook(() =>
      usePredictWorldCupMarkets({
        tabKey: 'group-stage',
        config,
      }),
    );

    expect(mockUsePredictMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams:
          'active=true&archived=false&closed=false&id=123&id=456',
        pageSize: 2,
        refine: expect.any(Function),
      }),
    );
    expect(result.current.hasMore).toBe(false);
  });

  it('skips fetching for a stage without configured event IDs', () => {
    const config = {
      ...DEFAULT_PREDICT_WORLD_CUP_FLAG,
      stages: [{ key: 'empty-stage', eventIds: [] }],
    };

    renderHook(() =>
      usePredictWorldCupMarkets({
        tabKey: 'empty-stage',
        config,
      }),
    );

    expect(mockUsePredictMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        customQueryParams: '',
        enabled: false,
      }),
    );
  });
});
