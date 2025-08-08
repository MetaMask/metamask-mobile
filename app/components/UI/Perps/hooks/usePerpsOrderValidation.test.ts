import { renderHook, waitFor } from '@testing-library/react-native';

// Configure waitFor with a shorter timeout for all tests
const fastWaitFor = (callback: () => void, options = {}) =>
  waitFor(callback, { timeout: 1000, ...options });
import { usePerpsOrderValidation } from './usePerpsOrderValidation';
import { usePerpsTrading } from './usePerpsTrading';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';
import { VALIDATION_THRESHOLDS } from '../constants/perpsConfig';
import type { OrderFormState } from '../types';

jest.mock('./usePerpsTrading');
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
      'perps.order.validation.only_hyperliquid_usdc':
        'Only HyperLiquid USDC supported',
      'perps.order.validation.high_leverage_warning': 'High leverage warning',
      'perps.order.validation.limit_price_required': 'Limit price required',
      'perps.order.validation.error': 'Validation error',
    };
    return translations[key] || key;
  }),
}));

describe('usePerpsOrderValidation', () => {
  const mockValidateOrder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to immediate resolution
    mockValidateOrder.mockResolvedValue({ isValid: true });
    (usePerpsTrading as jest.Mock).mockReturnValue({
      validateOrder: mockValidateOrder,
    });
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
    selectedPaymentToken: null,
    hasExistingPosition: false,
  };

  describe('protocol validation', () => {
    it('should pass when protocol validation passes', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation(defaultParams),
      );

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

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Minimum order size is $10.00');
    });
  });

  describe('existing position validation', () => {
    it('should fail when user has existing position', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          hasExistingPosition: true,
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Existing position for BTC');
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

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain(
        'Insufficient balance: need 10.00, have 5',
      );
    });
  });

  describe('payment token validation', () => {
    it('should pass with HyperLiquid mainnet token', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          selectedPaymentToken: {
            symbol: 'USDC',
            chainId: HYPERLIQUID_MAINNET_CHAIN_ID,
            image: '',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 6,
          },
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });

    it('should pass with HyperLiquid testnet token', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          selectedPaymentToken: {
            symbol: 'USDC',
            chainId: HYPERLIQUID_TESTNET_CHAIN_ID,
            image: '',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 6,
          },
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.errors).toEqual([]);
    });

    it('should fail with non-HyperLiquid token', async () => {
      mockValidateOrder.mockResolvedValue({ isValid: true });

      const { result } = renderHook(() =>
        usePerpsOrderValidation({
          ...defaultParams,
          selectedPaymentToken: {
            symbol: 'USDC',
            chainId: '0x1', // Ethereum mainnet
            image: '',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 6,
          },
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain(
        'Only HyperLiquid USDC supported',
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
            leverage: VALIDATION_THRESHOLDS.HIGH_LEVERAGE_WARNING + 5, // Test with leverage above threshold
          },
        }),
      );

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
            leverage: VALIDATION_THRESHOLDS.HIGH_LEVERAGE_WARNING - 5, // Test with leverage below threshold
          },
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.warnings).toEqual([]);
    });
  });

  describe('limit order validation', () => {
    it('should require limit price for limit orders', async () => {
      // Protocol validation should catch missing limit price
      mockValidateOrder.mockResolvedValue({
        isValid: false,
        error: 'Limit price required',
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

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toContain('Limit price required');
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
          hasExistingPosition: true,
          availableBalance: 5,
          marginRequired: '10.00',
        }),
      );

      await fastWaitFor(() => {
        expect(result.current.isValidating).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.errors).toHaveLength(3);
      expect(result.current.errors).toContain('Order too small');
      expect(result.current.errors).toContain('Existing position for BTC');
      expect(result.current.errors).toContain(
        'Insufficient balance: need 10.00, have 5',
      );
    });
  });
});
