import { calculateMaxBetAmount, generateOrderId } from './orders';

// Mock react-native-quick-crypto
jest.mock('react-native-quick-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
}));

describe('orders utils', () => {
  describe('generateOrderId', () => {
    it('returns a UUID string', () => {
      const orderId = generateOrderId();

      expect(typeof orderId).toBe('string');
      expect(orderId).toBe('mock-uuid-1234-5678-9012');
    });
  });

  describe('calculateMaxBetAmount', () => {
    it('returns the original amount when totalFeePercentage is 0', () => {
      const result = calculateMaxBetAmount(100, 0);

      expect(result).toBe(100);
    });

    it('returns reduced amount when totalFeePercentage is applied', () => {
      const result = calculateMaxBetAmount(100, 4);

      expect(result).toBe(96);
    });

    it('rounds result to 4 decimal places', () => {
      const result = calculateMaxBetAmount(100, 3.333);

      // 100 * (1 - 3.333/100) = 100 * 0.96667 = 96.667
      // Rounded to 4 decimals = 96.667
      expect(result).toBe(96.667);
    });

    it('handles small amounts correctly', () => {
      const result = calculateMaxBetAmount(1, 4);

      // 1 * (1 - 4/100) = 1 * 0.96 = 0.96
      expect(result).toBe(0.96);
    });

    it('handles very small fee percentages', () => {
      const result = calculateMaxBetAmount(100, 0.1);

      // 100 * (1 - 0.1/100) = 100 * 0.999 = 99.9
      expect(result).toBe(99.9);
    });

    it('handles large fee percentages', () => {
      const result = calculateMaxBetAmount(100, 50);

      // 100 * (1 - 50/100) = 100 * 0.5 = 50
      expect(result).toBe(50);
    });

    it('handles decimal amounts', () => {
      const result = calculateMaxBetAmount(50.5, 4);

      // 50.5 * (1 - 4/100) = 50.5 * 0.96 = 48.48
      expect(result).toBe(48.48);
    });

    it('handles edge case with 100% fee', () => {
      const result = calculateMaxBetAmount(100, 100);

      // 100 * (1 - 100/100) = 100 * 0 = 0
      expect(result).toBe(0);
    });

    it('handles zero amount', () => {
      const result = calculateMaxBetAmount(0, 4);

      expect(result).toBe(0);
    });

    it('preserves precision for amounts with many decimal places', () => {
      const result = calculateMaxBetAmount(100.123456, 4);

      // 100.123456 * 0.96 = 96.11851776, rounded to 4 decimals = 96.1185
      expect(result).toBe(96.1185);
    });
  });
});
