import { Side, type OrderPreview } from '../types';
import {
  calculateMaxBetAmount,
  generateOrderId,
  getPredictBuyAllInCost,
  getPredictExchangeFee,
  getPredictMarketFee,
  roundToFiveDecimals,
  roundUpToCents,
} from './orders';

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

  describe('roundUpToCents', () => {
    it('rounds up to the nearest cent', () => {
      expect(roundUpToCents(10.001)).toBe(10.01);
    });

    it('keeps exact cent values unchanged', () => {
      expect(roundUpToCents(10.01)).toBe(10.01);
    });

    it('keeps cent values with floating-point representation noise unchanged', () => {
      expect(roundUpToCents(10000.1 + 0.04)).toBe(10000.14);
    });

    it('rounds up real sub-cent values above the tolerance', () => {
      expect(roundUpToCents(10.010000001)).toBe(10.02);
    });

    it('returns zero for non-finite values', () => {
      expect(roundUpToCents(Number.NaN)).toBe(0);
    });
  });

  describe('roundToFiveDecimals', () => {
    it('rounds to five decimals', () => {
      expect(roundToFiveDecimals(0.123456)).toBe(0.12346);
    });

    it('rounds values below half of the smallest unit to zero', () => {
      expect(roundToFiveDecimals(0.000004)).toBe(0);
    });

    it('returns zero for non-positive values', () => {
      expect(roundToFiveDecimals(-1)).toBe(0);
    });
  });

  describe('predict fee helpers', () => {
    const preview: OrderPreview = {
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'token-1',
      timestamp: 1,
      side: Side.BUY,
      sharePrice: 0.5,
      maxAmountSpent: 10,
      minAmountReceived: 20,
      slippage: 0.03,
      tickSize: 0.01,
      minOrderSize: 0.01,
      negRisk: false,
      feeRateBps: '0',
      fees: {
        metamaskFee: 0.111,
        providerFee: 0.222,
        marketFee: 0.003,
        totalFee: 0.333,
        totalFeePercentage: 3.33,
        collector: '0x0',
      },
    };

    it('returns zero when marketFee is missing', () => {
      expect(getPredictMarketFee()).toBe(0);
    });

    it('combines provider fee and market fee for exchange fee', () => {
      expect(getPredictExchangeFee(preview.fees)).toBe(0.225);
    });

    it('returns the rounded all-in buy cost', () => {
      expect(getPredictBuyAllInCost(preview)).toBe(10.34);
    });

    it('returns zero all-in cost when preview is missing', () => {
      expect(getPredictBuyAllInCost(null)).toBe(0);
    });
  });
});
