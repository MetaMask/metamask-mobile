import { act, renderHook, waitFor } from '@testing-library/react-native';
import { OrderPreview, PlaceOrderParams } from '../providers/types';
import { usePredictAutoPlaceOrder } from './usePredictAutoPlaceOrder';

let mockTrackingState = {
  isConfirmed: false,
  hasFailed: false,
};

jest.mock('./usePredictOrderDepositTracking', () => ({
  usePredictOrderDepositTracking: () => mockTrackingState,
}));

const preview = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'outcome-token-1',
  timestamp: Date.now(),
  side: 'BUY',
  sharePrice: 0.5,
  maxAmountSpent: 10,
  minAmountReceived: 20,
  slippage: 0.005,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  fees: {
    metamaskFee: 0,
    providerFee: 0,
    totalFee: 0,
    totalFeePercentage: 0,
  },
} as unknown as OrderPreview;

const analyticsProperties = {
  marketId: 'market-1',
} as PlaceOrderParams['analyticsProperties'];

const createParams = () => ({
  amount: 25,
  transactionId: 'tx-1',
  isPredictBalanceSelected: true,
  canPlaceBet: true,
  preview,
  analyticsProperties,
  placeOrder: jest.fn().mockResolvedValue(undefined),
  setCurrentValue: jest.fn(),
  setCurrentValueUSDString: jest.fn(),
  setIsInputFocused: jest.fn(),
});

describe('usePredictAutoPlaceOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackingState = {
      isConfirmed: false,
      hasFailed: false,
    };
  });

  it('initializes input state from amount', () => {
    const params = createParams();

    renderHook(() => usePredictAutoPlaceOrder(params));

    expect(params.setCurrentValue).toHaveBeenCalledWith(25);
    expect(params.setCurrentValueUSDString).toHaveBeenCalledWith('25');
    expect(params.setIsInputFocused).toHaveBeenCalledWith(false);
  });

  it('clears auto-place loading when transaction id is missing', async () => {
    const params = createParams();
    params.transactionId = undefined;

    const { result } = renderHook(() => usePredictAutoPlaceOrder(params));

    await waitFor(() => {
      expect(result.current.isAutoPlaceLoading).toBe(false);
    });
  });

  it('places order after deposit confirmation', async () => {
    const params = createParams();
    mockTrackingState.isConfirmed = true;

    const { result } = renderHook(() => usePredictAutoPlaceOrder(params));

    await waitFor(() => {
      expect(params.placeOrder).toHaveBeenCalledWith({
        analyticsProperties,
        preview,
      });
      expect(result.current.isAutoPlaceLoading).toBe(false);
    });
  });

  it('does not place order before deposit is confirmed', async () => {
    const params = createParams();

    renderHook(() => usePredictAutoPlaceOrder(params));

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.placeOrder).not.toHaveBeenCalled();
  });

  it('does not place order when canPlaceBet is false', async () => {
    const params = createParams();
    params.canPlaceBet = false;
    mockTrackingState.isConfirmed = true;

    renderHook(() => usePredictAutoPlaceOrder(params));

    await act(async () => {
      await Promise.resolve();
    });

    expect(params.placeOrder).not.toHaveBeenCalled();
  });
});
