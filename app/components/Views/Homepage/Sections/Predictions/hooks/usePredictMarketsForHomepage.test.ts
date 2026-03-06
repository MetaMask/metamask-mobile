import { renderHook } from '@testing-library/react-native';
import { usePredictMarketsForHomepage } from './usePredictMarketsForHomepage';
import type { PredictMarket } from '../../../../../UI/Predict/types';

let mockIsPredictEnabled = true;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (...args: unknown[]) => unknown) => {
    if (
      selector ===
      jest.requireMock('../../../../../UI/Predict').selectPredictEnabledFlag
    ) {
      return mockIsPredictEnabled;
    }
    return undefined;
  },
}));

jest.mock('../../../../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(),
}));

const mockRefetch = jest.fn().mockResolvedValue(undefined);
let mockUsePredictMarketDataReturn: {
  marketData: PredictMarket[];
  isFetching: boolean;
  isFetchingMore: boolean;
  error: string | null;
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
    mockIsPredictEnabled = true;
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

  it('returns empty markets when predict is disabled', () => {
    mockIsPredictEnabled = false;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.markets).toHaveLength(0);
  });

  it('slices markets to the specified limit', () => {
    mockUsePredictMarketDataReturn.marketData = [
      createMockMarket('1'),
      createMockMarket('2'),
      createMockMarket('3'),
      createMockMarket('4'),
      createMockMarket('5'),
    ];

    const { result } = renderHook(() => usePredictMarketsForHomepage(3));

    expect(result.current.markets).toHaveLength(3);
    expect(result.current.markets[0].id).toBe('1');
    expect(result.current.markets[2].id).toBe('3');
  });

  it('forwards isFetching as isLoading', () => {
    mockUsePredictMarketDataReturn.isFetching = true;

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.isLoading).toBe(true);
  });

  it('forwards error from usePredictMarketData', () => {
    mockUsePredictMarketDataReturn.error = 'Network error';

    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.error).toBe('Network error');
  });

  it('returns null error when no error', () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    expect(result.current.error).toBeNull();
  });

  it('calls refetch when refresh is invoked', async () => {
    const { result } = renderHook(() => usePredictMarketsForHomepage(5));

    await result.current.refresh();

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('defaults limit to 5', () => {
    mockUsePredictMarketDataReturn.marketData = [
      createMockMarket('1'),
      createMockMarket('2'),
      createMockMarket('3'),
      createMockMarket('4'),
      createMockMarket('5'),
      createMockMarket('6'),
      createMockMarket('7'),
    ];

    const { result } = renderHook(() => usePredictMarketsForHomepage());

    expect(result.current.markets).toHaveLength(5);
  });
});
