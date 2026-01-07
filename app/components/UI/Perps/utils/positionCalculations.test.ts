import {
  calculateCloseAmountFromPercentage,
  validateCloseAmountLimits,
  formatCloseAmountDisplay,
  calculateCloseValue,
  formatCloseAmountUSD,
  calculatePercentageFromTokenAmount,
  calculatePercentageFromUSDAmount,
  getPositionDirection,
} from './positionCalculations';

describe('Position Calculations Utils', () => {
  describe('calculateCloseAmountFromPercentage', () => {
    it('calculates correct amounts for valid inputs', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: 50,
        positionSize: 10,
        currentPrice: 100,
        szDecimals: 6,
      });

      expect(result.tokenAmount).toBe(5);
      expect(result.usdValue).toBe(500);
    });

    it('returns zero for invalid inputs', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: NaN,
        positionSize: 10,
        currentPrice: 100,
        szDecimals: 6,
      });

      expect(result.tokenAmount).toBe(0);
      expect(result.usdValue).toBe(0);
    });

    it('handles negative position size correctly', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: 25,
        positionSize: -8,
        currentPrice: 50,
        szDecimals: 6,
      });

      expect(result.tokenAmount).toBe(2);
      expect(result.usdValue).toBe(100);
    });

    it('should ensure rounded size meets USD minimum for close position', () => {
      // Test BTC-like asset: $10.53 close at $105,258 price, szDecimals=5
      // (10/100) * 0.001 BTC = 0.0001 BTC
      // 0.0001 * 105258 = $10.5258
      // After rounding: 0.00010 → $10.5258 (meets minimum)
      const result = calculateCloseAmountFromPercentage({
        percentage: 10,
        positionSize: 0.001,
        currentPrice: 105258,
        szDecimals: 5,
      });

      // Verify token amount is rounded correctly
      expect(result.tokenAmount).toBe(0.0001);

      // Verify actual USD value from token amount
      // Note: result.usdValue is rounded to 2 decimals for display ($10.53)
      // but tokenAmount * price gives the actual value ($10.5258)
      const actualUsd = result.tokenAmount * 105258;
      expect(actualUsd).toBeCloseTo(10.5258, 2);

      // The returned usdValue should be the rounded display value
      expect(result.usdValue).toBe(10.53);
    });

    it('should handle low precision assets (ASTER with szDecimals=0)', () => {
      // ASTER-like asset: Close 10% of 100 tokens at $1.07575, szDecimals=0
      // (10/100) * 100 = 10 tokens
      // 10 * 1.07575 = $10.7575
      // After rounding: 10 tokens → $10.7575 (meets minimum)
      const result = calculateCloseAmountFromPercentage({
        percentage: 10,
        positionSize: 100,
        currentPrice: 1.07575,
        szDecimals: 0,
      });

      expect(result.tokenAmount).toBe(10);

      // Verify actual USD value from token amount
      const actualUsd = result.tokenAmount * 1.07575;
      expect(actualUsd).toBeCloseTo(10.7575, 2);

      // The returned usdValue should be the rounded display value
      expect(result.usdValue).toBe(10.76);
    });

    it('should add minimum increment when rounded size falls below USD value', () => {
      // Edge case: rounding causes USD value to fall below minimum
      // Close 1% of 1 BTC at $105,000, szDecimals=5
      // (1/100) * 1 = 0.01 BTC → USD = $1,050
      // After rounding to 5 decimals: 0.01000 BTC
      // Should verify this still equals at least $1,050
      const result = calculateCloseAmountFromPercentage({
        percentage: 1,
        positionSize: 1,
        currentPrice: 105000,
        szDecimals: 5,
      });

      const actualUsd = result.tokenAmount * 105000;
      expect(actualUsd).toBeGreaterThanOrEqual(result.usdValue);
    });

    it('should throw error when szDecimals is undefined', () => {
      expect(() =>
        calculateCloseAmountFromPercentage({
          percentage: 50,
          positionSize: 10,
          currentPrice: 100,
          // @ts-expect-error Testing runtime validation
          szDecimals: undefined,
        }),
      ).toThrow('szDecimals is required for close position calculation');
    });

    it('should throw error when szDecimals is null', () => {
      expect(() =>
        calculateCloseAmountFromPercentage({
          percentage: 50,
          positionSize: 10,
          currentPrice: 100,
          // @ts-expect-error Testing runtime validation
          szDecimals: null,
        }),
      ).toThrow('szDecimals is required for close position calculation');
    });

    it('should throw error when szDecimals is negative', () => {
      expect(() =>
        calculateCloseAmountFromPercentage({
          percentage: 50,
          positionSize: 10,
          currentPrice: 100,
          szDecimals: -1,
        }),
      ).toThrow('szDecimals must be >= 0, got: -1');
    });
  });

  describe('validateCloseAmountLimits', () => {
    it('returns the amount if within limits', () => {
      const result = validateCloseAmountLimits({
        amount: 50,
        maxAmount: 100,
        minAmount: 10,
      });

      expect(result).toBe(50);
    });

    it('clamps to maximum when amount exceeds max', () => {
      const result = validateCloseAmountLimits({
        amount: 150,
        maxAmount: 100,
      });

      expect(result).toBe(100);
    });

    it('clamps to minimum when amount is below min', () => {
      const result = validateCloseAmountLimits({
        amount: 5,
        maxAmount: 100,
        minAmount: 10,
      });

      expect(result).toBe(10);
    });

    it('returns 0 for invalid amounts', () => {
      const result = validateCloseAmountLimits({
        amount: NaN,
        maxAmount: 100,
      });

      expect(result).toBe(0);
    });
  });

  describe('formatCloseAmountDisplay', () => {
    it('formats USD amounts correctly', () => {
      const result = formatCloseAmountDisplay({
        value: '123.456',
        displayMode: 'usd',
      });

      expect(result).toBe('123.45');
    });

    it('formats token amounts correctly', () => {
      const result = formatCloseAmountDisplay({
        value: '1.123456789',
        displayMode: 'token',
      });

      expect(result).toBe('1.123457');
    });

    it('returns 0 for empty values', () => {
      const result = formatCloseAmountDisplay({
        value: '',
        displayMode: 'usd',
      });

      expect(result).toBe('0');
    });

    it('limits USD input to 2 decimal places', () => {
      const result = formatCloseAmountDisplay({
        value: '123.99999',
        displayMode: 'usd',
      });

      expect(result).toBe('123.99');
    });
  });

  describe('calculateCloseValue', () => {
    it('calculates USD value correctly', () => {
      const result = calculateCloseValue({
        amount: 5,
        price: 100,
      });

      expect(result).toBe(500);
    });

    it('returns 0 for invalid inputs', () => {
      const result = calculateCloseValue({
        amount: NaN,
        price: 100,
      });

      expect(result).toBe(0);
    });

    it('returns 0 for zero or negative price', () => {
      const result = calculateCloseValue({
        amount: 5,
        price: 0,
      });

      expect(result).toBe(0);
    });
  });

  describe('formatCloseAmountUSD', () => {
    it('formats USD value with 2 decimal places', () => {
      const result = formatCloseAmountUSD(1234.56);

      expect(result).toBe('1234.56');
    });

    it('formats whole numbers with 2 decimal places', () => {
      const result = formatCloseAmountUSD(500);

      expect(result).toBe('500.00');
    });

    it('rounds to 2 decimal places for values with more decimals', () => {
      const result = formatCloseAmountUSD(123.456789);

      expect(result).toBe('123.46');
    });

    it('formats zero as string with 2 decimal places', () => {
      const result = formatCloseAmountUSD(0);

      expect(result).toBe('0.00');
    });

    it('returns "0" for negative values', () => {
      const result = formatCloseAmountUSD(-100);

      expect(result).toBe('0');
    });

    it('returns "0" for NaN values', () => {
      const result = formatCloseAmountUSD(NaN);

      expect(result).toBe('0');
    });

    it('formats very small positive values correctly', () => {
      const result = formatCloseAmountUSD(0.01);

      expect(result).toBe('0.01');
    });

    it('formats large values correctly', () => {
      const result = formatCloseAmountUSD(1234567.89);

      expect(result).toBe('1234567.89');
    });

    it('rounds down for values ending in .xx4', () => {
      const result = formatCloseAmountUSD(10.004);

      expect(result).toBe('10.00');
    });

    it('rounds up for values ending in .xx5', () => {
      const result = formatCloseAmountUSD(10.005);

      expect(result).toBe('10.01');
    });
  });

  describe('calculatePercentageFromTokenAmount', () => {
    it('calculates percentage correctly', () => {
      const result = calculatePercentageFromTokenAmount(5, 10);
      expect(result).toBe(50);
    });

    it('handles zero total position size', () => {
      const result = calculatePercentageFromTokenAmount(5, 0);
      expect(result).toBe(0);
    });

    it('clamps result to 0-100 range', () => {
      const result = calculatePercentageFromTokenAmount(15, 10);
      expect(result).toBe(100);
    });

    it('handles negative position sizes', () => {
      const result = calculatePercentageFromTokenAmount(-3, -6);
      expect(result).toBe(50);
    });
  });

  describe('calculatePercentageFromUSDAmount', () => {
    it('calculates percentage correctly', () => {
      const result = calculatePercentageFromUSDAmount(250, 500);
      expect(result).toBe(50);
    });

    it('handles zero total position value', () => {
      const result = calculatePercentageFromUSDAmount(100, 0);
      expect(result).toBe(0);
    });

    it('clamps result to 0-100 range', () => {
      const result = calculatePercentageFromUSDAmount(600, 500);
      expect(result).toBe(100);
    });

    it('returns 0 for invalid inputs', () => {
      const result = calculatePercentageFromUSDAmount(NaN, 500);
      expect(result).toBe(0);
    });
  });

  describe('getPositionDirection', () => {
    it('returns "long" for positive position sizes', () => {
      expect(getPositionDirection('10.5')).toBe('long');
      expect(getPositionDirection('0.01')).toBe('long');
      expect(getPositionDirection('1000')).toBe('long');
    });

    it('returns "short" for negative position sizes', () => {
      expect(getPositionDirection('-10.5')).toBe('short');
      expect(getPositionDirection('-0.01')).toBe('short');
      expect(getPositionDirection('-1000')).toBe('short');
    });

    it('returns "unknown" for zero position size', () => {
      expect(getPositionDirection('0')).toBe('unknown');
      expect(getPositionDirection('0.0')).toBe('unknown');
      expect(getPositionDirection('-0')).toBe('unknown');
    });

    it('returns "unknown" for invalid strings', () => {
      expect(getPositionDirection('abc')).toBe('unknown');
      expect(getPositionDirection('not a number')).toBe('unknown');
      expect(getPositionDirection('')).toBe('unknown');
      expect(getPositionDirection(' ')).toBe('unknown');
    });

    it('returns "unknown" for non-finite values', () => {
      expect(getPositionDirection('Infinity')).toBe('unknown');
      expect(getPositionDirection('-Infinity')).toBe('unknown');
      expect(getPositionDirection('NaN')).toBe('unknown');
    });

    it('handles edge cases correctly', () => {
      expect(getPositionDirection('1e-10')).toBe('long'); // Very small positive
      expect(getPositionDirection('-1e-10')).toBe('short'); // Very small negative
      expect(getPositionDirection('1.23e15')).toBe('long'); // Large positive
      expect(getPositionDirection('-1.23e15')).toBe('short'); // Large negative
    });

    it('handles strings with whitespace', () => {
      expect(getPositionDirection(' 10.5 ')).toBe('long');
      expect(getPositionDirection(' -10.5 ')).toBe('short');
      expect(getPositionDirection('  0  ')).toBe('unknown');
    });
  });
});
