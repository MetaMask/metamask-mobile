import {
  validateCloseAmountLimits,
  formatCloseAmountDisplay,
  calculateCloseValue,
  formatCloseAmountUSD,
  calculatePercentageFromTokenAmount,
  calculatePercentageFromUSDAmount,
} from './positionCalculations';

describe('Position Calculations Utils', () => {
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
});
