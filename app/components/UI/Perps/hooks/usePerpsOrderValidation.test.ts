import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  VALIDATION_THRESHOLDS,
  type OrderFormState,
} from '@metamask/perps-controller';
import { usePerpsOrderValidation } from './usePerpsOrderValidation';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetwork } from './usePerpsNetwork';
import { strings } from '../../../../../locales/i18n';

// Configure waitFor with a shorter timeout for all tests
const fastWaitFor = (callback: () => void, options = {}) =>
  waitFor(callback, { timeout: 1000, ...options });

jest.mock('./usePerpsTrading');
jest.mock('./usePerpsNetwork', () => ({
  usePerpsNetwork: jest.fn(),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, values?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.order.validation.existing_position': `Existing position for ${values?.asset}`,
      'perps.order.validation.insufficient_balance': `Insufficient balance: need ${values?.required}, have ${values?.available}`,
      'perps.order.validation.minimum_amount': `Minimum order size is $${values?.amount}`,
      'perps.order.validation.high_leverage_warning': 'High leverage warning',
      'perps.order.validation.limit_price_required': 'Limit price required',
      'perps.order.validation.error': 'Validation error',
      'perps.order.validation.please_set_a_trigger_price':
        'Please set a trigger price',
      'perps.errors.orderValidation.triggerPricePositive':
        'Trigger price must be positive',
      'perps.order.validation.trigger_must_be_above_mid':
        'Trigger price must be higher than mid price',
      'perps.order.validation.trigger_must_be_below_mid':
        'Trigger price must be lower than mid price',
    };
    return translations[key] || key;
  }),
}));

describe('usePerpsOrderValidation', () => {
  const mockValidateOrder = jest.fn();
  const mockUsePerpsNetwork = usePerpsNetwork as jest.MockedFunction<
    typeof usePerpsNetwork
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Default to immediate resolution
    mockValidateOrder.mockResolvedValue({ isValid: true });
    (usePerpsTrading as jest.Mock).mockReturnValue({
      validateOrder: mockValidateOrder,
    });
    // Default to mainnet for tests
    mockUsePerpsNetwork.mockReturnValue('mainnet');
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const defaultOrderForm: OrderFormState = {
    asset: 'BTC',
    direction: 'long',
    amount: '100',
    leverage: 10,
    balancePercent: 10,
    type: 'market',
  };

  const defaultParams = {
    orderForm: defaultOrderForm,
    positionSize: '0.002',
    assetPrice: 50000,
    spendableBalance: 1000,
    marginRequired: '10.00',
  };

  const createDeferred = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((promiseResolve) => {
      resolve = promiseResolve;
    });
    return { promise, resolve };
  };

  describe('protocol validation', () => {
    it('clears existing errors when position size changes to zero', async () => {
      // Arrange
      mockValidateOrder.mockResolvedValue({
        isValid: false,
        error: 'Minimum order size is $10.00',
      });
      const { result, rerender } = renderHook(
        (params) => usePerpsOrderValidation(params),
        { initialProps: defaultParams },
      );
      await act(async () => {
        await Promise.resolve();
      });
      await fastWaitFor(() => {
        expect(result.current.errors).toContain('Minimum order size is $10.00');
      });

      // Act
      rerender({
        ...defaultParams,
        positionSize: '0',
      });

      // Assert
      expect(mockValidateOrder).toHaveBeenCalledTimes(1);
      expect(result.current.errors).toEqual([]);
      expect(result.current.isValid).toBe(false);
    });

    it('should pass when protocol validation passes', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation(defaultParams),
      );

      // Wait a tick for initial validation
      await act(async () => {
        await Promise.resolve();
      });

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });

    it('should fail when protocol validation fails', async () => {
      mockValidateOrder.mockResolvedValue({
        isValid: false,
        error: 'Minimum order size is $10.00',
      });

      const { result } = renderHook(() =>
        usePerpsOrderValidation(defaultParams),
      );

      // Wait a tick for initial validation
      await act(async () => {
        await Promise.resolve();
      });

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Minimum order size is $10.00');
    });
  });

  describe('existing position validation', () => {
    it('should allow user to place order when has existing position', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });
  });

  describe('balance validation', () => {
    it('should fail when insufficient balance', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          spendableBalance: 0.00004,
          marginRequired: '3.59',
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain(
        strings('perps.order.validation.insufficient_balance', {
          required: '3.59',
          available: '0.00004',
        }),
      );
      expect(result.current.hasInsufficientBalance).toBe(true);
    });
  });

  describe('leverage warnings', () => {
    it('should warn about high leverage', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: {
            ...defaultOrderForm,
            leverage: VALIDATION_THRESHOLDS.HighLeverageWarning + 5, // Test with leverage above threshold
          },
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.warnings).toContain('High leverage warning');
    });

    it('should not warn about normal leverage', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: {
            ...defaultOrderForm,
            leverage: VALIDATION_THRESHOLDS.HighLeverageWarning - 5, // Test with leverage below threshold
          },
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.warnings).toEqual([]);
    });
  });

  describe('limit order validation', () => {
    it('reports a missing limit price as a field issue', async () => {
      mockValidateOrder.mockResolvedValue({
        isValid: true,
      });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: {
            ...defaultOrderForm,
            type: 'limit',
            limitPrice: undefined,
          },
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toEqual([]);
      expect(result.current.fieldIssues).toEqual([
        { field: 'limitPrice', issue: { code: 'required' } },
      ]);
    });

    it('should pass with limit price for limit orders', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: {
            ...defaultOrderForm,
            type: 'limit',
            limitPrice: '49500',
          },
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockValidateOrder.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePerpsOrderValidation(defaultParams),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Validation error');
    });
  });

  describe('immediate first validation and debounced subsequent validation', () => {
    it('runs first validation immediately without debounce', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation(defaultParams),
      );

      // First validation runs immediately (no timer advance needed)
      await act(async () => {
        await Promise.resolve();
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(mockValidateOrder).toHaveBeenCalledTimes(1);
      expect(result.current.isValid).toBe(true);
    });

    it('debounces subsequent validations after the first immediate one', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result, rerender } = renderHook(
        (props) => usePerpsOrderValidation(props),
        { initialProps: defaultParams },
      );

      // First validation runs immediately
      await act(async () => {
        await Promise.resolve();
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(mockValidateOrder).toHaveBeenCalledTimes(1);

      // Change positionSize and assetPrice to trigger the effect's dependency array
      rerender({
        ...defaultParams,
        positionSize: '0.004',
        assetPrice: 51000,
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Validation should not fire yet (debouncing)
      expect(mockValidateOrder).toHaveBeenCalledTimes(1);

      // Advance timers to fire the debounced callback
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // Now the debounced validation should have fired
      expect(mockValidateOrder).toHaveBeenCalledTimes(2);
    });

    it('cleans up debounce timer on unmount', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result, rerender, unmount } = renderHook(
        (props) => usePerpsOrderValidation(props),
        { initialProps: defaultParams },
      );

      // First immediate validation
      await act(async () => {
        await Promise.resolve();
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      // Change deps to trigger debounced path
      rerender({
        ...defaultParams,
        positionSize: '0.005',
        assetPrice: 52000,
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Unmount before debounce fires - should clean up without error
      unmount();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Validation should only have been called once (the initial immediate call)
      expect(mockValidateOrder).toHaveBeenCalledTimes(1);
    });

    it('invalidates synchronously before a debounced protocol request runs', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result, rerender } = renderHook(
        (props) => usePerpsOrderValidation(props),
        {
          initialProps: {
            ...defaultParams,
            orderForm: {
              ...defaultOrderForm,
              type: 'limit' as const,
              limitPrice: '50000',
            },
          },
        },
      );

      await act(async () => {
        await Promise.resolve();
      });
      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      rerender({
        ...defaultParams,
        orderForm: {
          ...defaultOrderForm,
          type: 'limit',
          limitPrice: '',
        },
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.isValidating).toBe(true);
      expect(result.current.fieldIssues).toEqual([
        { field: 'limitPrice', issue: { code: 'required' } },
      ]);
    });

    it('retains confirmed validity while a protocol validation is pending', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result, rerender } = renderHook(
        (params) => usePerpsOrderValidation(params),
        { initialProps: defaultParams },
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });
      expect(result.current.isValid).toBe(true);

      rerender({
        ...defaultParams,
        assetPrice: 50100,
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.isValidating).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });
      expect(result.current.isValid).toBe(true);
    });

    it('ignores an out-of-order protocol response from an older request', async () => {
      const firstValidation = createDeferred<{
        isValid: boolean;
        error?: string;
      }>();
      const secondValidation = createDeferred<{
        isValid: boolean;
        error?: string;
      }>();
      mockValidateOrder
        .mockReturnValueOnce(firstValidation.promise)
        .mockReturnValueOnce(secondValidation.promise);

      const { result, rerender } = renderHook(
        (props) => usePerpsOrderValidation(props),
        { initialProps: defaultParams },
      );

      expect(mockValidateOrder).toHaveBeenCalledTimes(1);

      rerender({
        ...defaultParams,
        positionSize: '0.004',
      });
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(mockValidateOrder).toHaveBeenCalledTimes(2);

      await act(async () => {
        secondValidation.resolve({ isValid: true });
        await Promise.resolve();
      });
      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      await act(async () => {
        firstValidation.resolve({
          isValid: false,
          error: 'stale protocol error',
        });
        await Promise.resolve();
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });
  });

  describe('multiple errors', () => {
    it('should combine multiple validation errors', async () => {
      mockValidateOrder.mockResolvedValue({
        isValid: false,
        error: 'Order too small',
      });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          spendableBalance: 5,
          marginRequired: '10.00',
        }),
      );

      // Advance timers to trigger debounced validation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toHaveLength(2);
      expect(result.current.errors).toContain('Order too small');
      expect(result.current.errors).toContain(
        'Insufficient balance: need 10.00, have 5',
      );
    });
  });

  describe('reduce-only full close', () => {
    it('passes reduceOnly and isFullClose through to protocol validation', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: { ...defaultOrderForm, amount: '5' },
          reduceOnly: true,
          isFullClose: true,
          marginRequired: '0',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(mockValidateOrder).toHaveBeenCalled();
      });

      expect(mockValidateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          reduceOnly: true,
          isFullClose: true,
        }),
      );
      expect(mockValidateOrder.mock.calls[0][0]).not.toHaveProperty(
        'usdAmount',
      );
    });

    it('skips the UI minimum-amount error for a full reduce-only close', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          orderForm: { ...defaultOrderForm, amount: '5' },
          originalUsdAmount: '5',
          reduceOnly: true,
          isFullClose: true,
          marginRequired: '0',
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).not.toContain('Minimum order size is $10');
    });
  });

  describe('trigger orders', () => {
    it.each([
      {
        orderType: 'stop_market',
        direction: 'long',
        triggerPrice: '49999',
        requiredSide: 'above',
      },
      {
        orderType: 'stop_limit',
        direction: 'short',
        triggerPrice: '50001',
        requiredSide: 'below',
      },
      {
        orderType: 'take_profit_market',
        direction: 'long',
        triggerPrice: '50001',
        requiredSide: 'below',
      },
      {
        orderType: 'take_profit_limit',
        direction: 'short',
        triggerPrice: '49999',
        requiredSide: 'above',
      },
    ] as const)(
      'reports a typed trigger issue when $direction $orderType is on the wrong side of mid',
      async ({ orderType, direction, triggerPrice, requiredSide }) => {
        mockValidateOrder.mockResolvedValue({ isValid: true });

        const { result } = renderHook(() =>
          usePerpsOrderValidation({
            ...defaultParams,
            orderForm: {
              ...defaultOrderForm,
              type: orderType,
              direction,
              ...(orderType.endsWith('_limit') ? { limitPrice: '50000' } : {}),
            },
            triggerPrice,
            assetPrice: 50000,
            midPrice: 50000,
            szDecimals: 4,
          }),
        );

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        await fastWaitFor(() => {
          expect(result.current.isValidating).toBe(false);
        });

        expect(result.current.isValid).toBe(false);
        expect(result.current.errors).toEqual([]);
        expect(result.current.fieldIssues).toEqual(
          expect.arrayContaining([
            {
              field: 'triggerPrice',
              issue: expect.objectContaining({
                code: 'wrong_side',
                requiredSide,
              }),
            },
          ]),
        );
      },
    );

    it.each([
      {
        orderType: 'stop_market',
        direction: 'long',
        triggerPrice: '51000',
        limitPrice: '48000',
        expectedPrice: undefined,
      },
      {
        orderType: 'stop_limit',
        direction: 'short',
        triggerPrice: '49000',
        limitPrice: '49500',
        expectedPrice: '49500',
      },
      {
        orderType: 'take_profit_market',
        direction: 'long',
        triggerPrice: '49000',
        limitPrice: '48000',
        expectedPrice: undefined,
      },
      {
        orderType: 'take_profit_limit',
        direction: 'short',
        triggerPrice: '51000',
        limitPrice: '50500',
        expectedPrice: '50500',
      },
    ] as const)(
      'passes valid $direction $orderType prices to protocol validation',
      async ({
        orderType,
        direction,
        triggerPrice,
        limitPrice,
        expectedPrice,
      }) => {
        mockValidateOrder.mockResolvedValue({ isValid: true });

        renderHook(() =>
          usePerpsOrderValidation({
            ...defaultParams,
            orderForm: {
              ...defaultOrderForm,
              type: orderType,
              direction,
              limitPrice,
            },
            triggerPrice,
            assetPrice: 50000,
            midPrice: 50000,
            szDecimals: 4,
          }),
        );

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        await fastWaitFor(() => {
          expect(mockValidateOrder).toHaveBeenCalled();
        });

        const validationParams = mockValidateOrder.mock.calls[0][0];
        expect(validationParams).toEqual(
          expect.objectContaining({
            orderType,
            triggerPrice,
          }),
        );
        if (expectedPrice) {
          expect(validationParams.price).toBe(expectedPrice);
        } else {
          expect(validationParams).not.toHaveProperty('price');
        }
      },
    );

    it.each([
      {
        orderType: 'stop_limit',
        direction: 'long',
        triggerPrice: '51000',
        limitPrice: '49000',
      },
      {
        orderType: 'stop_limit',
        direction: 'short',
        triggerPrice: '49000',
        limitPrice: '51000',
      },
      {
        orderType: 'take_profit_limit',
        direction: 'long',
        triggerPrice: '49000',
        limitPrice: '51000',
      },
      {
        orderType: 'take_profit_limit',
        direction: 'short',
        triggerPrice: '51000',
        limitPrice: '49000',
      },
      {
        orderType: 'stop_limit',
        direction: 'long',
        triggerPrice: '51000',
        limitPrice: '51000',
      },
    ] as const)(
      'allows $direction $orderType when limit and trigger have no required relationship',
      async ({ orderType, direction, triggerPrice, limitPrice }) => {
        mockValidateOrder.mockResolvedValue({ isValid: true });

        const { result } = renderHook(() =>
          usePerpsOrderValidation({
            ...defaultParams,
            orderForm: {
              ...defaultOrderForm,
              type: orderType,
              direction,
              limitPrice,
            },
            triggerPrice,
            assetPrice: 50000,
            midPrice: 50000,
            szDecimals: 4,
          }),
        );

        act(() => {
          jest.advanceTimersByTime(1000);
        });

        await fastWaitFor(() => {
          expect(result.current.isValidating).toBe(false);
        });

        expect(result.current.isValid).toBe(true);
        expect(result.current.fieldIssues).toEqual([]);
      },
    );
  });
});
