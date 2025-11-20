import {
  calculatePositionSize,
  calculateMarginRequired,
  getMaxAllowedAmount,
  buildOrdersArray,
} from './orderCalculations';
import { ORDER_SLIPPAGE_CONFIG } from '../constants/perpsConfig';

describe('orderCalculations', () => {
  describe('calculatePositionSize', () => {
    it('should calculate position size correctly with szDecimals', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBe('0.200000');
    });

    it('should calculate position size with custom szDecimals', () => {
      // BTC-style decimals (3-5)
      const btcResult = calculatePositionSize({
        amount: '10000',
        price: 50000,
        szDecimals: 5,
      });
      expect(btcResult).toBe('0.20000');

      // ETH-style decimals (4)
      const ethResult = calculatePositionSize({
        amount: '10000',
        price: 3000,
        szDecimals: 4,
      });
      // 10000 / 3000 = 3.33333... → Math.round = 3.3333
      // 3.3333 * 3000 = 9999.9 < 10000, so increment by 0.0001
      expect(ethResult).toBe('3.3334'); // Incremented to meet USD minimum

      // DOGE-style decimals (0)
      const dogeResult = calculatePositionSize({
        amount: '100',
        price: 0.1,
        szDecimals: 0,
      });
      expect(dogeResult).toBe('1000');
    });

    it('should return 0 with correct decimals when amount is 0', () => {
      const resultDefault = calculatePositionSize({
        amount: '0',
        price: 50000,
        szDecimals: 6,
      });
      expect(resultDefault).toBe('0.000000');

      const resultCustom = calculatePositionSize({
        amount: '0',
        price: 50000,
        szDecimals: 3,
      });
      expect(resultCustom).toBe('0.000');
    });

    it('should return 0 with correct decimals when price is 0', () => {
      const resultDefault = calculatePositionSize({
        amount: '10000',
        price: 0,
        szDecimals: 6,
      });
      expect(resultDefault).toBe('0.000000');

      const resultCustom = calculatePositionSize({
        amount: '10000',
        price: 0,
        szDecimals: 2,
      });
      expect(resultCustom).toBe('0.00');
    });

    it('should handle empty amount string', () => {
      const result = calculatePositionSize({
        amount: '',
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBe('0.000000');
    });

    it('should handle very small positions', () => {
      const result = calculatePositionSize({
        amount: '1',
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBe('0.000020');
    });

    it('should handle very large positions', () => {
      const result = calculatePositionSize({
        amount: '1000000',
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBe('20.000000');
    });

    it('should use proper rounding (Math.round with USD validation)', () => {
      // Test that Math.round is used with validation to meet USD minimum
      const result = calculatePositionSize({
        amount: '11',
        price: 50000,
        szDecimals: 6,
      });
      expect(result).toBe('0.000220'); // Exact value, no rounding needed

      // Test case where Math.round rounds down but then gets adjusted up
      const result2 = calculatePositionSize({
        amount: '100',
        price: 30000,
        szDecimals: 8,
      });
      // 100 / 30000 = 0.00333333...
      // Math.round(0.00333333 * 10^8) / 10^8 = 0.00333333
      // But 0.00333333 * 30000 = 99.9999 < 100, so increment by 1/10^8
      expect(result2).toBe('0.00333334'); // Incremented to meet USD minimum
    });

    it('should handle $10 minimum order with low precision asset (ASTER edge case)', () => {
      // ASTER-like asset: $1.07575, szDecimals=0
      // User requests $10.00
      // 10 / 1.07575 = 9.295... → Math.round = 9
      // 9 * 1.07575 = 9.68175 < 10, so increment by 1
      // Result: 10 tokens = $10.7575
      const result = calculatePositionSize({
        amount: '10',
        price: 1.07575,
        szDecimals: 0,
      });

      expect(result).toBe('10'); // Incremented from 9 to 10 to meet $10 minimum

      // Verify actual USD value meets minimum
      const actualUsd = parseFloat(result) * 1.07575;
      expect(actualUsd).toBeGreaterThanOrEqual(10);
    });

    it('should handle $10 minimum order with mid precision asset (ETH edge case)', () => {
      // ETH-like asset: $3000, szDecimals=4
      // User requests $10.00
      // 10 / 3000 = 0.00333333... → Math.round = 0.0033
      // 0.0033 * 3000 = 9.90 < 10, so increment by 0.0001
      // Result: 0.0034 ETH = $10.20
      const result = calculatePositionSize({
        amount: '10',
        price: 3000,
        szDecimals: 4,
      });

      expect(result).toBe('0.0034'); // Incremented from 0.0033 to 0.0034

      // Verify actual USD value meets minimum
      const actualUsd = parseFloat(result) * 3000;
      expect(actualUsd).toBeGreaterThanOrEqual(10);
    });

    it('should throw error when szDecimals is undefined', () => {
      expect(() =>
        calculatePositionSize({
          amount: '100',
          price: 50000,
          // @ts-expect-error Testing runtime validation
          szDecimals: undefined,
        }),
      ).toThrow('szDecimals is required for position size calculation');
    });

    it('should throw error when szDecimals is null', () => {
      expect(() =>
        calculatePositionSize({
          amount: '100',
          price: 50000,
          // @ts-expect-error Testing runtime validation
          szDecimals: null,
        }),
      ).toThrow('szDecimals is required for position size calculation');
    });

    it('should throw error when szDecimals is negative', () => {
      expect(() =>
        calculatePositionSize({
          amount: '100',
          price: 50000,
          szDecimals: -1,
        }),
      ).toThrow('szDecimals must be >= 0, got: -1');
    });
  });

  describe('calculateMarginRequired', () => {
    it('should calculate margin correctly', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 10,
      });

      expect(result).toBe('1000.00');
    });

    it('should return 0 when amount is 0', () => {
      const result = calculateMarginRequired({
        amount: '0',
        leverage: 10,
      });

      expect(result).toBe('0.00');
    });

    it('should return 0 when leverage is 0', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 0,
      });

      expect(result).toBe('0.00');
    });

    it('should handle 1x leverage (no leverage)', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 1,
      });

      expect(result).toBe('10000.00');
    });

    it('should handle high leverage', () => {
      const result = calculateMarginRequired({
        amount: '10000',
        leverage: 100,
      });

      expect(result).toBe('100.00');
    });

    it('should handle decimal amounts', () => {
      const result = calculateMarginRequired({
        amount: '123.45',
        leverage: 5,
      });

      expect(result).toBe('24.69');
    });
  });

  describe('getMaxAllowedAmount', () => {
    it('should return 0 when available balance is 0', () => {
      // Arrange
      const params = {
        availableBalance: 0,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 10,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when asset price is invalid', () => {
      // Arrange
      const params = {
        availableBalance: 1000,
        assetPrice: 0,
        assetSzDecimals: 6,
        leverage: 10,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when szDecimals is undefined', () => {
      // Arrange
      const params = {
        availableBalance: 1000,
        assetPrice: 50000,
        assetSzDecimals: undefined as unknown as number,
        leverage: 10,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate max allowed amount with leverage', () => {
      // Arrange
      const params = {
        availableBalance: 100,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 10,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1000); // 100 * 10 leverage
    });

    it('should handle high leverage scenarios', () => {
      // Arrange
      const params = {
        availableBalance: 50,
        assetPrice: 30000,
        assetSzDecimals: 4,
        leverage: 100,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(5000); // 50 * 100 leverage
    });

    it('should account for position size rounding', () => {
      // Arrange
      const params = {
        availableBalance: 10,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 5,
      };

      // Act
      const result = getMaxAllowedAmount(params);

      // Assert
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(50); // 10 * 5 leverage
    });
  });

  describe('buildOrdersArray', () => {
    describe('Stop Loss Slippage Direction', () => {
      const baseParams = {
        assetId: 0,
        formattedPrice: '50000',
        formattedSize: '1.0',
        reduceOnly: false,
        orderType: 'market' as const,
        szDecimals: 5,
      };

      it('should apply slippage BELOW trigger price for long position stop loss (sell to exit)', () => {
        // Long position: isBuy=true (opening long)
        // Stop loss: selling to exit at $95,000 trigger
        // Expected: limit price 10% BELOW trigger = $85,500
        const result = buildOrdersArray({
          ...baseParams,
          isBuy: true, // Long position (buying to open)
          stopLossPrice: '95000',
        });

        expect(result.orders).toHaveLength(2); // Main order + SL order

        const slOrder = result.orders[1];
        expect(slOrder.b).toBe(false); // Selling to close long
        expect(slOrder.t).toEqual({
          trigger: {
            isMarket: true,
            triggerPx: '95000',
            tpsl: 'sl',
          },
        });

        // Verify limit price is 10% BELOW trigger (85500)
        const expectedLimitPrice =
          95000 * (1 - ORDER_SLIPPAGE_CONFIG.DEFAULT_TPSL_SLIPPAGE_BPS / 10000);
        expect(parseFloat(String(slOrder.p))).toBe(expectedLimitPrice);
        expect(parseFloat(String(slOrder.p))).toBe(85500); // 95000 * 0.90
      });

      it('should apply slippage ABOVE trigger price for short position stop loss (buy to exit)', () => {
        // Short position: isBuy=false (opening short)
        // Stop loss: buying to exit at $105,000 trigger
        // Expected: limit price 10% ABOVE trigger = $115,500
        const result = buildOrdersArray({
          ...baseParams,
          isBuy: false, // Short position (selling to open)
          stopLossPrice: '105000',
        });

        expect(result.orders).toHaveLength(2); // Main order + SL order

        const slOrder = result.orders[1];
        expect(slOrder.b).toBe(true); // Buying to close short
        expect(slOrder.t).toEqual({
          trigger: {
            isMarket: true,
            triggerPx: '105000',
            tpsl: 'sl',
          },
        });

        // Verify limit price is 10% ABOVE trigger (115500)
        const limitPrice = parseFloat(String(slOrder.p));
        expect(limitPrice).toBeCloseTo(115500, 0); // 105000 * 1.10 (allow rounding)
        expect(limitPrice).toBeGreaterThan(105000); // Most importantly: ABOVE trigger
      });

      it('should use 10% slippage for stop loss orders', () => {
        // Verify that the 10% slippage (1000 bps) is applied correctly
        const result = buildOrdersArray({
          ...baseParams,
          isBuy: true,
          stopLossPrice: '100000',
        });

        const slOrder = result.orders[1];
        const slippageValue =
          ORDER_SLIPPAGE_CONFIG.DEFAULT_TPSL_SLIPPAGE_BPS / 10000;

        expect(slippageValue).toBe(0.1); // 10%
        expect(parseFloat(String(slOrder.p))).toBe(100000 * 0.9); // 90000
      });

      it('should protect against adverse price movements in volatile conditions', () => {
        // Real-world scenario: BTC long with SL at $95K during rapid price drop
        // Slippage protection ensures order can execute even if price drops quickly
        const result = buildOrdersArray({
          ...baseParams,
          isBuy: true,
          stopLossPrice: '95000',
        });

        const slOrder = result.orders[1];
        const limitPrice = parseFloat(String(slOrder.p));

        // SL triggers at $95K, limit allows execution down to $85.5K
        expect(limitPrice).toBe(85500);

        // This protects against price dropping from $95K to $85.5K
        const protectionRange = 95000 - limitPrice;
        expect(protectionRange).toBe(9500); // $9,500 protection range
      });

      it('should handle fractional trigger prices correctly', () => {
        // Test with altcoin prices (e.g., $1.50 trigger)
        const result = buildOrdersArray({
          ...baseParams,
          isBuy: false, // Short position
          stopLossPrice: '1.50',
        });

        const slOrder = result.orders[1];
        const limitPrice = parseFloat(String(slOrder.p));

        // For short: limit should be 10% ABOVE trigger
        // Most importantly: verify direction is correct (ABOVE trigger)
        expect(limitPrice).toBeGreaterThan(1.5);
        // Verify it's approximately 10% higher (allowing for price formatting)
        expect(limitPrice).toBeGreaterThanOrEqual(1.6);
        expect(limitPrice).toBeLessThanOrEqual(1.75);
      });
    });

    describe('Stop Loss Order Structure', () => {
      const baseParams = {
        assetId: 0,
        formattedPrice: '50000',
        formattedSize: '1.0',
        reduceOnly: false,
        orderType: 'market' as const,
        szDecimals: 5,
        isBuy: true,
      };

      it('should create SL order with reduce-only flag', () => {
        const result = buildOrdersArray({
          ...baseParams,
          stopLossPrice: '95000',
        });

        const slOrder = result.orders[1];
        expect(slOrder.r).toBe(true); // Reduce-only
      });

      it('should create SL order with market execution on trigger', () => {
        const result = buildOrdersArray({
          ...baseParams,
          stopLossPrice: '95000',
        });

        const slOrder = result.orders[1];
        expect('trigger' in slOrder.t && slOrder.t.trigger?.isMarket).toBe(
          true,
        );
        expect('trigger' in slOrder.t && slOrder.t.trigger?.tpsl).toBe('sl');
      });

      it('should set SL order direction opposite to main order', () => {
        // Long position (isBuy=true) → SL sells (b=false)
        const longResult = buildOrdersArray({
          ...baseParams,
          isBuy: true,
          stopLossPrice: '95000',
        });
        expect(longResult.orders[1].b).toBe(false);

        // Short position (isBuy=false) → SL buys (b=true)
        const shortResult = buildOrdersArray({
          ...baseParams,
          isBuy: false,
          stopLossPrice: '105000',
        });
        expect(shortResult.orders[1].b).toBe(true);
      });

      it('should not create SL order when stopLossPrice is undefined', () => {
        const result = buildOrdersArray({
          ...baseParams,
          stopLossPrice: undefined,
        });

        expect(result.orders).toHaveLength(1); // Only main order
      });

      it('should create both TP and SL orders with correct grouping', () => {
        const result = buildOrdersArray({
          ...baseParams,
          takeProfitPrice: '55000',
          stopLossPrice: '45000',
        });

        expect(result.orders).toHaveLength(3); // Main + TP + SL
        expect(result.grouping).toBe('normalTpsl');
      });
    });
  });
});
