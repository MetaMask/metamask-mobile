import { renderHook } from '@testing-library/react-hooks';
import { usePredictionsFeed } from './usePredictionsFeed';

const mockUsePredictMarketData = jest.fn();
const mockUsePredictSearchMarketData = jest.fn();
const mockFuseSearch = jest.fn<unknown[], [unknown[], unknown, unknown]>(
  (items) => items,
);
const mockUseFeedRefresh = jest.fn();

jest.mock('../../../../UI/Predict/hooks/usePredictMarketData', () => ({
  usePredictMarketData: (args: unknown) => mockUsePredictMarketData(args),
}));

jest.mock('../../../../UI/Predict/hooks/usePredictSearchMarketData', () => ({
  usePredictSearchMarketData: (args: unknown) =>
    mockUsePredictSearchMarketData(args),
}));

jest.mock('../../hooks/useFeedRefresh', () => ({
  useFeedRefresh: (refresh: unknown, refetch: unknown) =>
    mockUseFeedRefresh(refresh, refetch),
}));

jest.mock('../search-utils', () => ({
  fuseSearch: (items: unknown[], query: unknown, options: unknown) =>
    mockFuseSearch(items, query, options),
  PREDICTIONS_FUSE_OPTIONS: {},
}));

const createMarkets = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `market-${index}` }));

const createFeedResult = (marketData = createMarkets(8)) => ({
  marketData,
  isFetching: false,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
  isFetchingMore: false,
  hasMore: false,
});

describe('usePredictionsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePredictMarketData.mockReturnValue(createFeedResult());
    mockUsePredictSearchMarketData.mockReturnValue(createFeedResult());
  });

  it('over-fetches no-query preview feeds and returns six visible markets', () => {
    const { result } = renderHook(() => usePredictionsFeed());

    expect(mockUsePredictMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'trending',
        pageSize: 20,
        enabled: true,
      }),
    );
    expect(result.current.data.map((market) => market.id)).toEqual([
      'market-0',
      'market-1',
      'market-2',
      'market-3',
      'market-4',
      'market-5',
    ]);
  });

  it('keeps search feeds on the requested page size without preview slicing', () => {
    const searchMarkets = createMarkets(10);
    mockUsePredictSearchMarketData.mockReturnValue(
      createFeedResult(searchMarkets),
    );

    const { result } = renderHook(() =>
      usePredictionsFeed({ query: 'world cup', pageSize: 10 }),
    );

    expect(mockUsePredictSearchMarketData).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'world cup',
        pageSize: 10,
        enabled: true,
      }),
    );
    expect(result.current.data).toEqual(searchMarkets);
  });
});
