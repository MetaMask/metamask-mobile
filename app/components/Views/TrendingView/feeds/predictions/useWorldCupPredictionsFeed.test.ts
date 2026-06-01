import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { DEFAULT_PREDICT_WORLD_CUP_FLAG } from '../../../../UI/Predict/constants/flags';
import {
  selectPredictWorldCupConfig,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../../../UI/Predict/selectors/featureFlags';
import { useWorldCupPredictionsFeed } from './useWorldCupPredictionsFeed';

const mockUsePredictWorldCupMarkets = jest.fn();
const mockUseFeedRefresh = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../UI/Predict/hooks/usePredictWorldCup', () => ({
  usePredictWorldCupMarkets: (args: unknown) =>
    mockUsePredictWorldCupMarkets(args),
}));

jest.mock('../../hooks/useFeedRefresh', () => ({
  useFeedRefresh: (refresh: unknown, refetch: unknown) =>
    mockUseFeedRefresh(refresh, refetch),
}));

const createMarkets = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `world-cup-${index}` }));

describe('useWorldCupPredictionsFeed', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectPredictWorldCupConfig) {
        return DEFAULT_PREDICT_WORLD_CUP_FLAG;
      }
      if (selector === selectPredictWorldCupScreenEnabledFlag) {
        return true;
      }
      return undefined;
    });
    mockUsePredictWorldCupMarkets.mockReturnValue({
      marketData: createMarkets(8),
      isFetching: false,
      refetch: jest.fn(),
      fetchMore: jest.fn(),
      isFetchingMore: false,
      hasMore: false,
    });
  });

  it('over-fetches World Cup preview markets and returns six visible markets', () => {
    const { result } = renderHook(() => useWorldCupPredictionsFeed());

    expect(mockUsePredictWorldCupMarkets).toHaveBeenCalledWith(
      expect.objectContaining({
        tabKey: 'all',
        pageSize: 20,
        enabled: true,
      }),
    );
    expect(result.current.data.map((market) => market.id)).toEqual([
      'world-cup-0',
      'world-cup-1',
      'world-cup-2',
      'world-cup-3',
      'world-cup-4',
      'world-cup-5',
    ]);
  });
});
