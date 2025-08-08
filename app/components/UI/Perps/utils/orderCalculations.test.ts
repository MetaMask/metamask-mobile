import {
  calculatePositionSize,
  calculateMarginRequired,
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
});
