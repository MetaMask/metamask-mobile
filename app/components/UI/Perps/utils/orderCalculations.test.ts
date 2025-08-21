import {
  calculatePositionSize,
  calculateMarginRequired,
} from './orderCalculations';

describe('orderCalculations', () => {
  describe('calculatePositionSize', () => {
    it('should calculate position size correctly', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 50000,
      });

      expect(result).toBe('0.200000');
    });

    it('should return 0 when amount is 0', () => {
      const result = calculatePositionSize({
        amount: '0',
        price: 50000,
      });

      expect(result).toBe('0.000000');
    });

    it('should return 0 when price is 0', () => {
      const result = calculatePositionSize({
        amount: '10000',
        price: 0,
      });

      expect(result).toBe('0.000000');
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
