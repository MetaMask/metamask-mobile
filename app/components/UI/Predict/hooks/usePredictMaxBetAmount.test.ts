import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { Side, type OrderPreview } from '../types';
import { usePredictMaxBetAmount } from './usePredictMaxBetAmount';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../queries', () => ({
  predictQueries: {
    maxBuyOrderPreview: {
      options: jest.fn((params) => params),
    },
  },
}));

const mockUseQuery = jest.mocked(useQuery);

const fallbackPreview: OrderPreview = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 200,
  slippage: 0.03,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  fees: {
    metamaskFee: 2,
    providerFee: 2,
    marketFee: 1,
    totalFee: 4,
    totalFeePercentage: 4,
    collector: '0x0',
  },
};

const defaultParams = {
  availableBalance: 100,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
};

describe('usePredictMaxBetAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
    } as ReturnType<typeof useQuery>);
  });

  it('returns the maximum fully fillable stake from the provider preview', () => {
    mockUseQuery.mockReturnValue({
      data: { maxAmountSpent: 95.23 },
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => usePredictMaxBetAmount(defaultParams));
    expect(result.current.maxBetAmount).toBe(95.23);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, refetchInterval: 1000 }),
    );
  });

  it('reports loading while the provider preview is being calculated', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isFetching: true,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() => usePredictMaxBetAmount(defaultParams));

    expect(result.current.isLoading).toBe(true);
  });

  it('uses the existing fee estimate while the max preview loads', () => {
    const { result } = renderHook(() =>
      usePredictMaxBetAmount({ ...defaultParams, preview: fallbackPreview }),
    );

    expect(result.current.maxBetAmount).toBe(95.23);
  });

  it('returns zero when the provider finds no fillable cent-denominated buy', () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isFetching: false,
    } as ReturnType<typeof useQuery>);

    const { result } = renderHook(() =>
      usePredictMaxBetAmount({ ...defaultParams, preview: fallbackPreview }),
    );

    expect(result.current.maxBetAmount).toBe(0);
  });

  it('returns the raw balance without requesting fees when disabled', () => {
    const { result } = renderHook(() =>
      usePredictMaxBetAmount({ ...defaultParams, enabled: false }),
    );

    expect(result.current.maxBetAmount).toBe(100);
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false, refetchInterval: false }),
    );
  });
});
