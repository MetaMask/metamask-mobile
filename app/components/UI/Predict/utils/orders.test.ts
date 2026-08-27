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
    const createPreview = ({
      stake = 100,
      serviceFeePercentage = 0,
      marketFee = 0,
    }: {
      stake?: number;
      serviceFeePercentage?: number;
      marketFee?: number;
    } = {}): OrderPreview => ({
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'token-1',
      timestamp: 1,
      side: Side.BUY,
      sharePrice: 0.5,
      maxAmountSpent: stake,
      minAmountReceived: 200,
      slippage: 0.03,
      tickSize: 0.01,
      minOrderSize: 1,
      negRisk: false,
      fees: {
        metamaskFee: 0,
        providerFee: 0,
        marketFee,
        totalFee: 0,
        totalFeePercentage: serviceFeePercentage,
        collector: '0x0',
      },
    });

    it('returns the balance when the preview has no fees', () => {
      const result = calculateMaxBetAmount(100, createPreview());

      expect(result).toBe(100);
    });

    it('divides the balance by one plus the service fee rate', () => {
      const result = calculateMaxBetAmount(
        100,
        createPreview({ serviceFeePercentage: 4 }),
      );

      expect(result).toBe(96.15);
    });

    it('includes the odds-dependent market fee rate', () => {
      const result = calculateMaxBetAmount(
        100,
        createPreview({ serviceFeePercentage: 4, marketFee: 1 }),
      );

      expect(result).toBe(95.23);
    });

    it('derives the market fee rate from the preview stake', () => {
      const result = calculateMaxBetAmount(
        100,
        createPreview({ stake: 50, marketFee: 1 }),
      );

      expect(result).toBe(98.03);
    });

    it('floors the maximum to cents', () => {
      const result = calculateMaxBetAmount(
        10,
        createPreview({ serviceFeePercentage: 4 }),
      );

      expect(result).toBe(9.61);
    });

    it('returns the balance when no fee preview is available', () => {
      const result = calculateMaxBetAmount(50.5);

      expect(result).toBe(50.5);
    });

    it('returns zero for a non-positive balance', () => {
      const result = calculateMaxBetAmount(
        -1,
        createPreview({ serviceFeePercentage: 4 }),
      );

      expect(result).toBe(0);
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
