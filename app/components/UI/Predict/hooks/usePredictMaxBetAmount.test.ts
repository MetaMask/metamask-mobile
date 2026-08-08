import { renderHook } from '@testing-library/react-native';
import { Side, type OrderPreview } from '../types';
import { usePredictMaxBetAmount } from './usePredictMaxBetAmount';

let mockFeeReferencePreview: OrderPreview | null = null;
let mockIsCalculating = false;
const mockUsePredictOrderPreview = jest.fn();

jest.mock('./usePredictOrderPreview', () => ({
  usePredictOrderPreview: (params: unknown) => {
    mockUsePredictOrderPreview(params);
    return {
      preview: mockFeeReferencePreview,
      isCalculating: mockIsCalculating,
    };
  },
}));

const createPreview = ({
  stake = 100,
  serviceFeePercentage = 4,
  marketFee = 1,
}: {
  stake?: number;
  serviceFeePercentage?: number;
  marketFee?: number;
} = {}): OrderPreview => ({
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: stake,
  minAmountReceived: 200,
  slippage: 0.03,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  fees: {
    metamaskFee: 2,
    providerFee: 2,
    marketFee,
    totalFee: 4,
    totalFeePercentage: serviceFeePercentage,
    collector: '0x0',
  },
});

const defaultParams = {
  availableBalance: 100,
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
};

describe('usePredictMaxBetAmount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeeReferencePreview = null;
    mockIsCalculating = false;
  });

  it('uses the current order preview to calculate the fee-adjusted maximum', () => {
    const preview = createPreview();

    const { result } = renderHook(() =>
      usePredictMaxBetAmount({ ...defaultParams, preview }),
    );

    expect(result.current.maxBetAmount).toBe(95.23);
    expect(mockUsePredictOrderPreview).toHaveBeenCalledWith(
      expect.objectContaining({ size: 0 }),
    );
  });

  it('requests a minimum-stake preview as the initial fee reference', () => {
    mockFeeReferencePreview = createPreview({ stake: 1, marketFee: 0.01 });

    const { result } = renderHook(() => usePredictMaxBetAmount(defaultParams));

    expect(result.current.maxBetAmount).toBe(95.23);
    expect(mockUsePredictOrderPreview).toHaveBeenCalledWith(
      expect.objectContaining({ size: 1 }),
    );
  });

  it('reports loading while the initial fee reference is being calculated', () => {
    mockIsCalculating = true;

    const { result } = renderHook(() => usePredictMaxBetAmount(defaultParams));

    expect(result.current.isLoading).toBe(true);
  });

  it('returns the raw balance without requesting fees when disabled', () => {
    const { result } = renderHook(() =>
      usePredictMaxBetAmount({ ...defaultParams, enabled: false }),
    );

    expect(result.current.maxBetAmount).toBe(100);
    expect(mockUsePredictOrderPreview).toHaveBeenCalledWith(
      expect.objectContaining({ size: 0 }),
    );
  });
});
