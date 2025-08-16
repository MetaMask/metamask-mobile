import {
  validatePerpsOrder,
  type OrderValidationParams,
} from './orderValidation';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';

// Mock i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (params) {
      return `${key}: ${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

describe('validatePerpsOrder', () => {
  const baseParams: OrderValidationParams = {
    orderForm: {
      asset: 'BTC',
      direction: 'long',
      amount: '100',
      leverage: 10,
      balancePercent: 10,
    },
    marginRequired: '10',
    availableBalance: 1000,
    marketData: {
      name: 'BTC',
      szDecimals: 6,
      maxLeverage: 50,
      marginTableId: 1,
    },
    selectedPaymentToken: {
      symbol: 'USDC',
      address: '0x1234',
      decimals: 6,
      chainId: HYPERLIQUID_MAINNET_CHAIN_ID,
      name: 'USDC',
      balance: '1000',
      balanceFiat: '$1000',
    },
    orderType: 'market' as const,
  };

  describe('amount validation', () => {
    it('should return error when amount is 0', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, amount: '0' },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain('perps.order.validation.amount_required');
      expect(result.isValid).toBe(false);
    });

    it('should return error when amount is below minimum', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, amount: '5' },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.minimum_amount: {"amount":"10"}',
      );
      expect(result.isValid).toBe(false);
    });

    it('should return error when amount exceeds maximum', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, amount: '150000' },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.maximum_amount: {"amount":"100,000"}',
      );
      expect(result.isValid).toBe(false);
    });
  });

  describe('balance validation', () => {
    it('should return error when margin exceeds available balance', () => {
      const params = {
        ...baseParams,
        marginRequired: '2000',
        availableBalance: 1000,
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.insufficient_balance: {"required":"2000","available":"1000"}',
      );
      expect(result.isValid).toBe(false);
    });

    it('should pass when margin is within available balance', () => {
      const params = {
        ...baseParams,
        marginRequired: '500',
        availableBalance: 1000,
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        expect.stringContaining('insufficient_balance'),
      );
    });
  });

  describe('leverage validation', () => {
    it('should return error when leverage is below 1', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, leverage: 0.5 },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.invalid_leverage: {"min":"1","max":"50"}',
      );
      expect(result.isValid).toBe(false);
    });

    it('should return error when leverage exceeds market max', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, leverage: 60 },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.invalid_leverage: {"min":"1","max":"50"}',
      );
      expect(result.isValid).toBe(false);
    });

    it('should add warning for high leverage', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, leverage: 40 },
      };

      const result = validatePerpsOrder(params);

      expect(result.warnings).toContain(
        'perps.order.validation.high_leverage_warning',
      );
      expect(result.isValid).toBe(true);
    });

    it('should use fallback max leverage when market data is null', () => {
      const params = {
        ...baseParams,
        marketData: null,
        orderForm: { ...baseParams.orderForm, leverage: 60 }, // Above fallback max of 3
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        `perps.order.validation.invalid_leverage: {"min":"1","max":"3"}`,
      );
    });
  });

  describe('payment token validation', () => {
    it('should return error for non-Hyperliquid USDC token', () => {
      if (!baseParams.selectedPaymentToken) {
        throw new Error('selectedPaymentToken is required');
      }
      const params: OrderValidationParams = {
        ...baseParams,
        selectedPaymentToken: {
          ...baseParams.selectedPaymentToken,
          chainId: '0x1' as `0x${string}`, // Ethereum mainnet
        },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.only_hyperliquid_usdc',
      );
      expect(result.isValid).toBe(false);
    });

    it('should pass for Hyperliquid mainnet USDC', () => {
      const result = validatePerpsOrder(baseParams);

      expect(result.errors).not.toContain(
        'perps.order.validation.only_hyperliquid_usdc',
      );
    });

    it('should pass for Hyperliquid testnet USDC', () => {
      if (!baseParams.selectedPaymentToken) {
        throw new Error('selectedPaymentToken is required');
      }
      const params: OrderValidationParams = {
        ...baseParams,
        selectedPaymentToken: {
          ...baseParams.selectedPaymentToken,
          chainId: HYPERLIQUID_TESTNET_CHAIN_ID,
        },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        'perps.order.validation.only_hyperliquid_usdc',
      );
    });

    it('should pass when no payment token is selected', () => {
      const params = {
        ...baseParams,
        selectedPaymentToken: null,
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        'perps.order.validation.only_hyperliquid_usdc',
      );
    });
  });

  describe('limit order validation', () => {
    it('should return error when limit order has no price', () => {
      const params = {
        ...baseParams,
        orderType: 'limit' as const,
        orderForm: { ...baseParams.orderForm, limitPrice: undefined },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain(
        'perps.order.validation.limit_price_required',
      );
      expect(result.isValid).toBe(false);
    });

    it('should pass when limit order has price', () => {
      const params = {
        ...baseParams,
        orderType: 'limit' as const,
        orderForm: { ...baseParams.orderForm, limitPrice: '50000' },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        'perps.order.validation.limit_price_required',
      );
      expect(result.isValid).toBe(true);
    });

    it('should not check limit price for market orders', () => {
      const params = {
        ...baseParams,
        orderType: 'market' as const,
        orderForm: { ...baseParams.orderForm, limitPrice: undefined },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        'perps.order.validation.limit_price_required',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty amount string', () => {
      const params = {
        ...baseParams,
        orderForm: { ...baseParams.orderForm, amount: '' },
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).toContain('perps.order.validation.amount_required');
    });

    it('should handle NaN margin required', () => {
      const params = {
        ...baseParams,
        marginRequired: 'invalid',
      };

      const result = validatePerpsOrder(params);

      expect(result.errors).not.toContain(
        expect.stringContaining('insufficient_balance'),
      );
    });

    it('should return valid when all validations pass', () => {
      const result = validatePerpsOrder(baseParams);

      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });
});
