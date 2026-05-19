import { renderHook, act } from '@testing-library/react-native';
import { OrderPreview, Side } from '../../../types';
import { getPlaceOrderErrorOutcome } from '../../../utils/predictErrorHandler';
import { usePredictBuyError } from './usePredictBuyError';

const mockClearOrderError = jest.fn();

let mockActiveOrder: { error?: string } | null = null;
let mockIsBalanceLoading = false;
let mockIsPredictBalanceSelected = true;
let mockSelectedPaymentToken: { address: string; chainId: string } | null =
  null;

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
    selectedPaymentToken: mockSelectedPaymentToken,
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
    if (key === 'predict.order.no_funds_enough') {
      return 'Not enough funds.';
    }
    if (key === 'predict.order.no_funds_enough_try_token') {
      return 'Not enough funds. Try a different token.';
    }
    return key;
  }),
}));

jest.mock('../../../utils/format', () => ({
  formatPrice: jest.fn((value: number) => `$${value.toFixed(2)}`),
  formatCents: jest.fn((value: number) => `${Math.round(value * 100)}¢`),
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
  isPayFeesLoading: false,
  isPaySystemSettling: false,
  blockingPayAlertMessage: null as string | null,
  // Inline banner UX is sheet-mode-only; default these tests to sheet mode so
  // banner / errorMessage suppression behavior is exercised. The dedicated
  // 'legacy mode' describe below overrides this to assert the alternative
  // full-screen contract.
  isSheetMode: true,
};

describe('usePredictBuyError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrder = null;
    mockIsBalanceLoading = false;
    mockIsPredictBalanceSelected = true;
    mockSelectedPaymentToken = null;
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
      // active-order errors are surfaced via buyErrorBanner now, not errorMessage
      expect(result.current.errorMessage).toBeUndefined();
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('returns the pay token balance alert for external payment tokens', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBe('Pay token balance alert');
      expect(result.current.errorMessageSource).toBe('blocking_pay_alert');
    });

    it('keeps the pay token balance alert visible while pay fees are loading', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isPayFeesLoading: true,
          blockingPayAlertMessage: 'Insufficient payment token balance',
        }),
      );

      expect(mockGetPlaceOrderErrorOutcome).not.toHaveBeenCalled();
      expect(result.current.errorMessage).toBe(
        'Insufficient payment token balance',
      );
      expect(result.current.errorMessageSource).toBe('blocking_pay_alert');
    });

    it('suppresses pay token balance alert message while pay system is settling', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isPaySystemSettling: true,
          blockingPayAlertMessage: 'Insufficient payment token balance',
        }),
      );

      expect(result.current.errorMessage).toBeUndefined();
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
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
      expect(result.current.errorMessageSource).toBe('preview');
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

    it('returns generic no funds message when Predict balance is insufficient', () => {
      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isInsufficientBalance: true,
        }),
      );

      expect(result.current.errorMessage).toBe('Not enough funds.');
      expect(result.current.errorMessageSource).toBe('insufficient_balance');
    });

    it('returns generic try-token message when external token balance is insufficient', () => {
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isInsufficientBalance: true,
        }),
      );

      expect(result.current.errorMessage).toBe(
        'Not enough funds. Try a different token.',
      );
      expect(result.current.errorMessageSource).toBe('insufficient_balance');
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

    it('returns undefined errorMessage when activeOrder has generic error (banner takes over)', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      // active-order error suppresses inline errorMessage in favor of the banner
      expect(result.current.errorMessage).toBeUndefined();
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('suppresses errorMessage when predict balance is selected even with blockingPayAlertMessage', () => {
      mockActiveOrder = { error: 'something broke' };
      mockIsPredictBalanceSelected = true;
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(result.current.errorMessage).toBeUndefined();
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('returns pay alert errorMessage when external token has blockingPayAlertMessage', () => {
      mockActiveOrder = { error: 'something broke' };
      mockIsPredictBalanceSelected = false;
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(result.current.errorMessage).toBe('Pay token balance alert');
      expect(result.current.errorMessageSource).toBe('blocking_pay_alert');
      expect(result.current.buyErrorBanner).toBeNull();
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

  describe('buyErrorBanner', () => {
    it('returns null when activeOrder has no error', () => {
      mockActiveOrder = {};

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('returns price_changed variant when activeOrder error is order_not_filled', () => {
      mockActiveOrder = { error: 'BUY_ORDER_NOT_FULLY_FILLED' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.buyErrorBanner).toEqual({
        variant: 'price_changed',
        title: 'predict.order.price_changed_title',
        description: 'predict.order.price_changed_body',
      });
    });

    it('returns order_failed variant when activeOrder error is generic', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.buyErrorBanner).toEqual({
        variant: 'order_failed',
        title: 'predict.order.order_failed_title',
        description: 'predict.order.order_failed_body',
      });
    });

    it('returns null when blockingPayAlertMessage takes precedence for external token', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('ignores blockingPayAlertMessage when predict balance is selected', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = true;
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('returns null while order is still placing', () => {
      mockActiveOrder = { error: 'order failed' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isPlacingOrder: true }),
      );

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('returns banner even when balance is loading after auto-reopen', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsBalanceLoading = true;
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('returns order_failed banner when preview is null but activeOrder.error is set', () => {
      mockActiveOrder = { error: 'order failed' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, preview: null }),
      );

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('persists order_failed banner when activeOrder error is cleared by controller refresh', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result, rerender } = renderHook(() =>
        usePredictBuyError(defaultParams),
      );

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );

      mockActiveOrder = null;
      rerender({});

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );
    });

    it('clears a persisted order_failed banner when clearBuyErrorBanner is called', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result, rerender } = renderHook(() =>
        usePredictBuyError(defaultParams),
      );

      mockActiveOrder = null;
      rerender({});
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );

      act(() => {
        result.current.clearBuyErrorBanner();
      });

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('clears a persisted order_failed banner when the selected payment token changes', () => {
      mockIsPredictBalanceSelected = false;
      mockSelectedPaymentToken = { address: '0xTokenA', chainId: '0x1' };
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result, rerender } = renderHook(() =>
        usePredictBuyError(defaultParams),
      );

      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );

      mockActiveOrder = null;
      rerender({});
      expect(result.current.buyErrorBanner).toEqual(
        expect.objectContaining({ variant: 'order_failed' }),
      );

      mockSelectedPaymentToken = { address: '0xTokenB', chainId: '0x1' };
      rerender({});

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('falls back to outcomeTokenPrice for price_changed body when preview is null', () => {
      mockActiveOrder = { error: 'BUY_ORDER_NOT_FULLY_FILLED' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          preview: null,
          outcomeTokenPrice: 0.42,
        }),
      );

      expect(result.current.buyErrorBanner).toEqual({
        variant: 'price_changed',
        title: 'predict.order.price_changed_title',
        description: 'predict.order.price_changed_body',
      });
    });
  });

  describe('clearBuyErrorBanner', () => {
    it('calls clearOrderError and resets isOrderNotFilled', () => {
      mockActiveOrder = { error: 'not filled' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.isOrderNotFilled).toBe(true);

      act(() => {
        result.current.clearBuyErrorBanner();
      });

      expect(mockClearOrderError).toHaveBeenCalledTimes(1);
      expect(result.current.isOrderNotFilled).toBe(false);
    });

    it('is the same reference as resetOrderNotFilled', () => {
      const { result } = renderHook(() => usePredictBuyError(defaultParams));

      expect(result.current.resetOrderNotFilled).toBe(
        result.current.clearBuyErrorBanner,
      );
    });
  });

  describe('legacy mode (isSheetMode: false)', () => {
    it('returns null buyErrorBanner regardless of activeOrder.error', () => {
      mockActiveOrder = { error: 'order failed' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'parsed message',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isSheetMode: false }),
      );

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('returns null buyErrorBanner for order_not_filled active errors', () => {
      mockActiveOrder = { error: 'BUY_ORDER_NOT_FULLY_FILLED' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'order_not_filled',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isSheetMode: false }),
      );

      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('surfaces the active-order error string via errorMessage (no banner suppression)', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { result } = renderHook(() =>
        usePredictBuyError({ ...defaultParams, isSheetMode: false }),
      );

      expect(result.current.errorMessage).toBe('Order placement failed');
      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('still returns blockingPayAlertMessage as errorMessage in legacy mode', () => {
      mockActiveOrder = { error: 'order failed' };
      mockIsPredictBalanceSelected = false;

      const { result } = renderHook(() =>
        usePredictBuyError({
          ...defaultParams,
          isSheetMode: false,
          blockingPayAlertMessage: 'Pay token balance alert',
        }),
      );

      expect(result.current.errorMessage).toBe('Pay token balance alert');
      expect(result.current.buyErrorBanner).toBeNull();
    });

    it('defaults to legacy mode when isSheetMode is omitted', () => {
      mockActiveOrder = { error: 'something broke' };
      mockGetPlaceOrderErrorOutcome.mockReturnValue({
        status: 'error',
        error: 'Order placement failed',
      });

      const { isSheetMode: _ignored, ...paramsWithoutSheetMode } =
        defaultParams;

      const { result } = renderHook(() =>
        usePredictBuyError(paramsWithoutSheetMode),
      );

      expect(result.current.buyErrorBanner).toBeNull();
      expect(result.current.errorMessage).toBe('Order placement failed');
    });
  });
});
