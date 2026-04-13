import { renderHook, act } from '@testing-library/react-native';
import { OrderPreview, Side } from '../../../types';
import { getPlaceOrderErrorOutcome } from '../../../utils/predictErrorHandler';
import { usePredictBuyError } from './usePredictBuyError';

const mockClearOrderError = jest.fn();

let mockActiveOrder: { error?: string } | null = null;
let mockIsBalanceLoading = false;
let mockIsPredictBalanceSelected = true;

jest.mock('../../../hooks/usePredictActiveOrder', () => ({
  usePredictActiveOrder: () => ({
    activeOrder: mockActiveOrder,
    clearOrderError: mockClearOrderError,
  }),
}));

jest.mock('../../../hooks/usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: 0,
    isLoading: false,
  }),
}));

jest.mock('../../../hooks/usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock('./usePredictBuyAvailableBalance', () => ({
  usePredictBuyAvailableBalance: () => ({
    availableBalance: 1000,
    isBalanceLoading: mockIsBalanceLoading,
  }),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, options?: Record<string, unknown>) => {
    if (key === 'predict.order.prediction_minimum_bet') {
      return `Minimum bet: ${options?.amount}`;
    }
    if (key === 'predict.order.prediction_insufficient_funds') {
      return `Not enough funds. You can use up to ${options?.amount}.`;
    }
    if (key === 'predict.order.no_funds_enough') {
      return 'Not enough funds.';
    }
    if (key === 'predict.order.prediction_insufficient_funds_try_token') {
      return `Not enough funds. You can use up to ${options?.amount}, or try a different token.`;
    }
    if (key === 'predict.order.no_funds_enough_try_token') {
      return 'Not enough funds. Try a different token.';
    }
    return key;
  }),
}));

jest.mock('../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
}));

jest.mock('../../../constants/transactions', () => ({
  MINIMUM_BET: 1,
}));

jest.mock('../../../utils/predictErrorHandler', () => ({
  getPlaceOrderErrorOutcome: jest.fn(),
}));

const mockGetPlaceOrderErrorOutcome =
  getPlaceOrderErrorOutcome as jest.MockedFunction<
    typeof getPlaceOrderErrorOutcome
  >;

const createMockPreview = (
  overrides?: Partial<OrderPreview>,
): OrderPreview => ({
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  timestamp: 1000000,
  side: Side.BUY,
  sharePrice: 0.5,
  maxAmountSpent: 100,
  minAmountReceived: 180,
  slippage: 0.01,
  tickSize: 0.01,
  minOrderSize: 1,
  negRisk: false,
  rateLimited: false,
  fees: {
    totalFee: 5,
    metamaskFee: 2,
    providerFee: 3,
    totalFeePercentage: 0.05,
    collector: '0xCollector',
  },
  ...overrides,
});

const defaultParams = {
  preview: createMockPreview(),
  previewError: null as string | null,
  isConfirming: false,
  isPlacingOrder: false,
  isBelowMinimum: false,
  isInsufficientBalance: false,
  maxBetAmount: 100,
  isPayFeesLoading: false,
  isInputFocused: false,
  blockingPayAlertMessage: null as string | null,
};

describe('usePredictBuyError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockIsBalanceLoading = false;
    mockIsPredictBalanceSelected = true;
  });

  describe('errorResult', () => {
    it('returns undefined errorMessage when isBalanceLoading is true', () => {
      mockIsBalanceLoading = true;
      mockActiveOrder = { error: 'some error' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.errorMessage).toBeUndefined();
      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
    });

    it('returns undefined errorMessage when isPlacingOrder is true', () => {
      mockActiveOrder = { error: 'some error' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isPlacingOrder: true }),
      );

      expect(result.current.errorMessage).toBeUndefined();
      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
    });

    it('returns undefined errorMessage when isConfirming is true', () => {
      mockActiveOrder = { error: 'some error' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isConfirming: true }),
      );

      expect(result.current.errorMessage).toBeUndefined();
      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
    });

    it('returns undefined errorMessage when preview is null', () => {
      mockActiveOrder = { error: 'some error' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, preview: null }),
      );

      expect(result.current.errorMessage).toBeUndefined();
      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
    });

    it('calls getPlaceOrderErrorOutcome when activeOrder has error and no blocking conditions', () => {
      mockActiveOrder = { error: 'order failed' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error message',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(mockGetPlaceOrderErrorOutcome).toHaveBeenCalledWith({
        error: 'order failed',
        orderParams: { preview: defaultParams.preview },
      });
      expect(result.current.errorMessage).toBe('parsed error message');
    });

    it('returns the pay token balance alert message for external payment tokens', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Insufficient payment token balance',
        }),
      );

      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBe(
        'Insufficient payment token balance',
      );
    });

    it('suppresses pay token balance alert while input is focused', () => {
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Insufficient payment token balance',
          isInputFocused: true,
        }),
      );

      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns undefined when activeOrder has no error', () => {
      mockActiveOrder = {};

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBeUndefined();
    });
  });

  describe('errorMessage', () => {
    it('returns previewError when it exists (highest priority)', () => {
      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          previewError: 'Preview failed',
        }),
      );

      expect(result.current.errorMessage).toBe('Preview failed');
    });

    it('returns previewError even when other error conditions exist', () => {
      mockActiveOrder = { error: 'order error' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed error',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          previewError: 'Preview failed',
          isBelowMinimum: true,
          isInsufficientBalance: true,
        }),
      );

      expect(result.current.errorMessage).toBe('Preview failed');
    });

    it('returns minimum bet message when isBelowMinimum is true and no errorResult', () => {
      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isBelowMinimum: true,
        }),
      );

      expect(result.current.errorMessage).toBe('Minimum bet: $1.00');
    });

    it('returns insufficient funds message with formatted max when maxBetAmount >= MINIMUM_BET', () => {
      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isInsufficientBalance: true,
          maxBetAmount: 50,
        }),
      );

      expect(result.current.errorMessage).toBe(
        'Not enough funds. You can use up to $50.00, or try a different token.',
      );
    });

    it('returns generic no funds message when maxBetAmount < MINIMUM_BET', () => {
      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isInsufficientBalance: true,
          maxBetAmount: 0.5,
        }),
      );

      expect(result.current.errorMessage).toBe(
        'Not enough funds. Try a different token.',
      );
    });

    it('returns undefined when no error conditions exist', () => {
      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns undefined when errorResult status is order_not_filled', () => {
      mockActiveOrder = { error: 'order not filled' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.errorMessage).toBeUndefined();
    });

    it('returns error string when errorResult status is error', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.errorMessage).toBe('Order placement failed');
    });
  });

  describe('isOrderNotFilled', () => {
    it('sets to true when errorResult status is order_not_filled', () => {
      mockActiveOrder = { error: 'not filled' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.isOrderNotFilled).toBe(true);
    });

    it('remains false when errorResult status is error', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.isOrderNotFilled).toBe(false);
    });

    it('remains false when no activeOrder error exists', () => {
      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.isOrderNotFilled).toBe(false);
    });
  });

  describe('resetOrderNotFilled', () => {
    it('calls clearOrderError and resets isOrderNotFilled to false', () => {
      mockActiveOrder = { error: 'not filled' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.isOrderNotFilled).toBe(true);

      act(() => {
        result.current.resetOrderNotFilled();
      });

      expect(mockClearOrderError).toHaveBeenCalledTimes(1);
      expect(result.current.isOrderNotFilled).toBe(false);
    });
  });
});
