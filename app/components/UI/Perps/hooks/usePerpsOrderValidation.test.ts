import { act, renderHook, waitFor } from '@testing-library/react-native';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';
import type { OrderFormState } from '../types/perps-types';
import { usePerpsOrderValidation } from './usePerpsOrderValidation';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetwork } from './usePerpsNetwork';

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
      'perps.order.validation.high_leverage_warning': 'High leverage warning',
      'perps.order.validation.limit_price_required': 'Limit price required',
      'perps.order.validation.error': 'Validation error',
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
    availableBalance: 1000,
    marginRequired: '10.00',
  };

  describe('protocol validation', () => {
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
          availableBalance: 5,
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
      expect(result.current.errors).toContain(
        'Insufficient balance: need 10.00, have 5',
      );
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
    it('should not validate limit price requirement (removed for better UX)', async () => {
      // Protocol validation no longer checks for missing limit price
      // The flow automatically switches to market orders if limit price isn't set
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

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
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

  describe('multiple errors', () => {
    it('should combine multiple validation errors', async () => {
      mockValidateOrder.mockResolvedValue({
        isValid: false,
        error: 'Order too small',
      });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          availableBalance: 5,
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
});
