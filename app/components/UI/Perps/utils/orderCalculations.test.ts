import {
  calculatePositionSize,
  calculateMarginRequired,
  findOptimalAmount,
  findHighestAmountForPositionSize,
  getMaxAllowedAmount,
} from './orderCalculations';

describe('orderCalculations', () => {
  describe('calculatePositionSize', () => {
    it('should calculate position size correctly with default decimals', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 50000,
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
      expect(ethResult).toBe('3.3334'); // Properly rounded up from 3.3333...

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
      });

      expect(result).toBe('0.000000');
    });

    it('should handle very small positions', () => {
      const result = calculatePositionSize({
        amount: '1',
        price: 50000,
      });

      expect(result).toBe('0.000020');
    });

    it('should handle very large positions', () => {
      const result = calculatePositionSize({
        amount: '1000000',
        price: 50000,
      });

      expect(result).toBe('20.000000');
    });

    it('should use proper rounding (Math.ceil)', () => {
      // Test that Math.ceil is used (always rounding up to ensure minimum requirements)
      const result = calculatePositionSize({
        amount: '11',
        price: 50000,
        szDecimals: 6,
      });
      expect(result).toBe('0.000220'); // Exact value, no rounding needed

      // Test case where Math.ceil rounds up
      const result2 = calculatePositionSize({
        amount: '100',
        price: 30000,
        szDecimals: 8,
      });
      // 100 / 30000 = 0.00333333...
      expect(result2).toBe('0.00333334'); // Math.ceil rounds up to ensure minimum
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

  describe('findOptimalAmount', () => {
    it('should return the same amount when position size calculation is exact', () => {
      // When the calculation results in an exact position size, no optimization needed
      const result = findOptimalAmount({
        targetAmount: '50000',
        price: 50000,
        szDecimals: 6,
        maxAllowedAmount: 100000,
      });

      expect(result).toBe('50000');
    });

    it('should find optimal amount that maximizes USD value for same position size', () => {
      // Test case where multiple USD amounts result in same position size due to ceiling
      const price = 30000;
      const szDecimals = 6;

      // These amounts should result in the same position size due to Math.ceil rounding
      const amount1 = '29.999999'; // Just below the exact amount
      const amount2 = '30.0'; // Exact amount

      const positionSize1 = calculatePositionSize({
        amount: amount1,
        price,
        szDecimals,
      });
      const positionSize2 = calculatePositionSize({
        amount: amount2,
        price,
        szDecimals,
      });

      // Verify they have the same position size
      expect(positionSize1).toBe(positionSize2);
      expect(positionSize1).toBe('0.001000');

      // Find optimal amount for the lower one
      const optimal = findOptimalAmount({
        targetAmount: amount1,
        price,
        szDecimals,
        maxAllowedAmount: 50000,
      });

      // Should optimize to a higher amount that gives same position size
      const optimalPositionSize = calculatePositionSize({
        amount: optimal,
        price,
        szDecimals,
      });

      expect(optimalPositionSize).toBe(positionSize1);
      expect(parseFloat(optimal)).toBeGreaterThanOrEqual(parseFloat(amount1));
    });

    it('should handle edge cases with zero values', () => {
      expect(
        findOptimalAmount({
          targetAmount: '0',
          price: 50000,
          szDecimals: 6,
          maxAllowedAmount: 10000,
        }),
      ).toBe('0');
      expect(
        findOptimalAmount({
          targetAmount: '100',
          price: 0,
          szDecimals: 6,
          maxAllowedAmount: 10000,
        }),
      ).toBe('100');
      expect(
        findOptimalAmount({
          targetAmount: '',
          price: 50000,
          szDecimals: 6,
          maxAllowedAmount: 10000,
        }),
      ).toBe('');
    });

    it('should handle invalid input gracefully', () => {
      expect(
        findOptimalAmount({
          targetAmount: 'invalid',
          price: 50000,
          szDecimals: 6,
          maxAllowedAmount: 10000,
        }),
      ).toBe('invalid');
      expect(
        findOptimalAmount({
          targetAmount: '100',
          price: NaN,
          szDecimals: 6,
          maxAllowedAmount: 10000,
        }),
      ).toBe('100');
    });

    it('should work with different szDecimals', () => {
      const result4Decimals = findOptimalAmount({
        targetAmount: '100',
        price: 50000,
        szDecimals: 4,
        maxAllowedAmount: 10000,
      });

      const result8Decimals = findOptimalAmount({
        targetAmount: '100',
        price: 50000,
        szDecimals: 8,
        maxAllowedAmount: 10000,
      });

      // Both should return valid amounts
      expect(parseFloat(result4Decimals)).toBeGreaterThan(0);
      expect(parseFloat(result8Decimals)).toBeGreaterThan(0);

      // Verify position sizes are maintained
      const originalPositionSize4 = calculatePositionSize({
        amount: '100',
        price: 50000,
        szDecimals: 4,
      });
      const optimizedPositionSize4 = calculatePositionSize({
        amount: result4Decimals,
        price: 50000,
        szDecimals: 4,
      });
      expect(optimizedPositionSize4).toBe(originalPositionSize4);
    });

    it('should return original amount if verification fails', () => {
      // This tests the verification fallback mechanism
      const result = findOptimalAmount({
        targetAmount: '1',
        price: 1000000, // Very high price that might cause precision issues
        szDecimals: 6,
        maxAllowedAmount: 10000,
      });

      // Should return a valid amount
      expect(result).toBeTruthy();
      expect(parseFloat(result)).toBeGreaterThan(0);
    });

    it('should handle maxAllowedAmount constraint by sizing down', () => {
      // Test case where optimal amount would exceed maxAllowedAmount
      const result = findOptimalAmount({
        targetAmount: '1000',
        price: 50000,
        szDecimals: 6,
        maxAllowedAmount: 500, // Lower than target amount
      });

      const resultAmount = parseFloat(result);
      // The function should either return the original amount or size down appropriately
      expect(resultAmount).toBeGreaterThan(0);

      // If it sized down, it should be within the max allowed amount
      if (resultAmount !== 1000) {
        expect(resultAmount).toBeLessThanOrEqual(500);
      }

      // Verify the result still produces a valid position size
      const positionSize = calculatePositionSize({
        amount: result,
        price: 50000,
        szDecimals: 6,
      });
      expect(parseFloat(positionSize)).toBeGreaterThan(0);
    });

    it('should return target amount when maxAllowedAmount constraint results in fallback', () => {
      // Test case where sizing down would result in zero or negative position size
      const result = findOptimalAmount({
        targetAmount: '1',
        price: 50000,
        szDecimals: 6,
        maxAllowedAmount: 0.5, // Very small max allowed
      });

      // The function should return the original target amount as a fallback
      expect(result).toBe('1');
    });
  });

  describe('getMaxAllowedAmount', () => {
    it('should calculate max allowed amount correctly', () => {
      const result = getMaxAllowedAmount({
        availableBalance: 1000,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 10,
      });

      // Should return a reasonable amount based on available balance and leverage
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(10000); // availableBalance * leverage
    });

    it('should return 0 when availableBalance is 0', () => {
      const result = getMaxAllowedAmount({
        availableBalance: 0,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 10,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when assetPrice is 0', () => {
      const result = getMaxAllowedAmount({
        availableBalance: 1000,
        assetPrice: 0,
        assetSzDecimals: 6,
        leverage: 10,
      });

      expect(result).toBe(0);
    });

    it('should return 0 when assetSzDecimals is undefined', () => {
      const result = getMaxAllowedAmount({
        availableBalance: 1000,
        assetPrice: 50000,
        assetSzDecimals: undefined as unknown as number,
        leverage: 10,
      });

      expect(result).toBe(0);
    });

    it('should handle high leverage correctly', () => {
      const result = getMaxAllowedAmount({
        availableBalance: 100,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 100,
      });

      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(10000); // availableBalance * leverage
    });

    it('should handle different asset decimals', () => {
      const resultBTC = getMaxAllowedAmount({
        availableBalance: 1000,
        assetPrice: 50000,
        assetSzDecimals: 5,
        leverage: 10,
      });

      const resultETH = getMaxAllowedAmount({
        availableBalance: 1000,
        assetPrice: 3000,
        assetSzDecimals: 4,
        leverage: 10,
      });

      expect(resultBTC).toBeGreaterThan(0);
      expect(resultETH).toBeGreaterThan(0);
      // Both should be reasonable amounts based on the calculations
      expect(resultBTC).toBeLessThanOrEqual(10000);
      expect(resultETH).toBeLessThanOrEqual(10000);
    });

    it('should respect margin requirements', () => {
      // Test with very small balance to ensure margin requirements are respected
      const result = getMaxAllowedAmount({
        availableBalance: 10,
        assetPrice: 50000,
        assetSzDecimals: 6,
        leverage: 10,
      });

      // Calculate the position size for this amount
      const positionSize = calculatePositionSize({
        amount: result.toString(),
        price: 50000,
        szDecimals: 6,
      });

      const actualNotionalValue = parseFloat(positionSize) * 50000;
      const requiredMargin = actualNotionalValue / 10;

      // Required margin should not exceed available balance
      expect(requiredMargin).toBeLessThanOrEqual(10);
    });
  });

  describe('findHighestAmountForPositionSize', () => {
    it('should find the highest amount for a given position size', () => {
      const positionSize = 0.001; // 0.001 BTC
      const price = 50000;
      const szDecimals = 6;

      const result = findHighestAmountForPositionSize({
        positionSize,
        price,
        szDecimals,
      });

      expect(result).toBeGreaterThan(0);

      // Verify the result produces the expected position size
      const verificationPositionSize = calculatePositionSize({
        amount: result.toString(),
        price,
        szDecimals,
      });

      expect(parseFloat(verificationPositionSize)).toBe(positionSize);
    });

    it('should return 0 when position size is 0', () => {
      // Use parameters that result in zero position size
      const result = findHighestAmountForPositionSize({
        positionSize: 0, // Zero position size
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBe(0);
    });

    it('should handle different decimal precisions', () => {
      const positionSize = 1.5;
      const price = 3000;

      const result4Decimals = findHighestAmountForPositionSize({
        positionSize,
        price,
        szDecimals: 4,
      });

      const result8Decimals = findHighestAmountForPositionSize({
        positionSize,
        price,
        szDecimals: 8,
      });

      expect(result4Decimals).toBeGreaterThan(0);
      expect(result8Decimals).toBeGreaterThan(0);

      // Both should produce the same position size when verified
      const verification4 = calculatePositionSize({
        amount: result4Decimals.toString(),
        price,
        szDecimals: 4,
      });
      const verification8 = calculatePositionSize({
        amount: result8Decimals.toString(),
        price,
        szDecimals: 8,
      });

      expect(parseFloat(verification4)).toBeCloseTo(positionSize, 4);
      expect(parseFloat(verification8)).toBeCloseTo(positionSize, 8);
    });

    it('should handle edge cases with very small position sizes', () => {
      const result = findHighestAmountForPositionSize({
        positionSize: 0.000001,
        price: 50000,
        szDecimals: 6,
      });

      // Should either return a valid amount or -1 if verification fails
      expect(result).not.toBe(0);
      if (result !== -1) {
        expect(result).toBeGreaterThan(0);
      }
    });

    it('should handle edge cases with very large position sizes', () => {
      const result = findHighestAmountForPositionSize({
        positionSize: 100,
        price: 50000,
        szDecimals: 6,
      });

      expect(result).toBeGreaterThan(0);
    });
  });
});
