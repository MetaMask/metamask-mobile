import {
  calculateCloseAmountFromPercentage,
  validateCloseAmountLimits,
  formatCloseAmountDisplay,
  calculateCloseValue,
  calculatePercentageFromTokenAmount,
  calculatePercentageFromUSDAmount,
} from './positionCalculations';

describe('Position Calculations Utils', () => {
  describe('calculateCloseAmountFromPercentage', () => {
    it('calculates correct amounts for valid inputs', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: 50,
        positionSize: 10,
        currentPrice: 100,
      });

      expect(result.tokenAmount).toBe(5);
      expect(result.usdValue).toBe(500);
    });

    it('returns zero for invalid inputs', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: NaN,
        positionSize: 10,
        currentPrice: 100,
      });

      expect(result.tokenAmount).toBe(0);
      expect(result.usdValue).toBe(0);
    });

    it('handles negative position size correctly', () => {
      const result = calculateCloseAmountFromPercentage({
        percentage: 25,
        positionSize: -8,
        currentPrice: 50,
      });

      expect(result.tokenAmount).toBe(2);
      expect(result.usdValue).toBe(100);
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
});
