import { Side, type OrderPreview } from '../types';
import {
  buildPredictFeeBreakdownAmounts,
  calculateMaxBetAmount,
  estimatePredictSellNetValue,
  generateOrderId,
  getPredictBuyAllInCost,
  getPredictExchangeFee,
  getPredictMarketFee,
  getPredictPositionDisplay,
  getPredictPositionNetValue,
  getPredictSellNetProceeds,
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

    it('returns net proceeds after metamask, provider, and market fees', () => {
      const result = getPredictSellNetProceeds(preview);

      expect(result).toBe(19.66);
    });

    it('returns zero proceeds when preview is missing', () => {
      const result = getPredictSellNetProceeds(null);

      expect(result).toBe(0);
    });
  });

  describe('estimatePredictSellNetValue', () => {
    it('returns floored net value when fee collection is enabled', () => {
      const result = estimatePredictSellNetValue({
        grossValue: 100.019,
        feeCollection: {
          enabled: true,
          metamaskFee: 0.02,
          providerFee: 0.02,
        },
      });

      expect(result).toBe(96.01);
    });

    it('returns floored gross value when fee collection is disabled', () => {
      const result = estimatePredictSellNetValue({
        grossValue: 100.019,
        feeCollection: {
          enabled: false,
          metamaskFee: 0.02,
          providerFee: 0.02,
        },
      });

      expect(result).toBe(100.01);
    });
  });

  describe('getPredictPositionDisplay', () => {
    it('returns negative cash PnL when net value is below cost', () => {
      const result = getPredictPositionDisplay({
        initialValue: 100,
        netValue: 80,
      });

      expect(result).toEqual({
        value: 80,
        cashPnl: -20,
        percentPnl: -20,
      });
    });

    it('returns zero percent PnL when initial value is not positive', () => {
      const result = getPredictPositionDisplay({
        initialValue: 0,
        netValue: 50,
      });

      expect(result).toEqual({
        value: 50,
        cashPnl: 50,
        percentPnl: 0,
      });
    });
  });

  describe('getPredictPositionNetValue', () => {
    const feeCollection = {
      enabled: true,
      metamaskFee: 0.02,
      providerFee: 0.02,
    };

    it('returns floored gross value when the position is not sellable', () => {
      const result = getPredictPositionNetValue({
        sellable: false,
        grossValue: 101.019,
        preview: {
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'token-1',
          timestamp: 1,
          side: Side.SELL,
          sharePrice: 1,
          maxAmountSpent: 0,
          minAmountReceived: 80,
          slippage: 0,
          tickSize: 0.01,
          minOrderSize: 1,
          negRisk: false,
        },
        feeCollection,
      });

      expect(result).toBe(101.01);
    });

    it('returns preview proceeds when sellable and a preview exists', () => {
      const result = getPredictPositionNetValue({
        sellable: true,
        grossValue: 100,
        preview: {
          marketId: 'market-1',
          outcomeId: 'outcome-1',
          outcomeTokenId: 'token-1',
          timestamp: 1,
          side: Side.SELL,
          sharePrice: 0.5,
          maxAmountSpent: 0,
          minAmountReceived: 20,
          slippage: 0,
          tickSize: 0.01,
          minOrderSize: 1,
          negRisk: false,
          fees: {
            metamaskFee: 0.1,
            providerFee: 0.1,
            totalFee: 0.2,
            totalFeePercentage: 1,
            collector: '0x0',
          },
        },
        feeCollection,
      });

      expect(result).toBe(19.8);
    });
  });

  describe('buildPredictFeeBreakdownAmounts', () => {
    it('snaps buy rows so the remainder exchange fee makes the total identity hold', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.BUY,
        order: 10.001,
        metamaskFee: 0.004,
        depositFee: 0.003,
        total: 10.03,
      });

      expect(result).toEqual({
        order: 10.01,
        metamaskFee: 0.01,
        exchangeFee: 0,
        depositFee: 0.01,
        total: 10.03,
      });
      expect(
        result.order +
          result.metamaskFee +
          result.exchangeFee +
          (result.depositFee ?? 0),
      ).toBe(result.total);
    });

    it('snaps sell rows so the remainder exchange fee makes the total identity hold', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.SELL,
        order: 10.019,
        metamaskFee: 0.014,
        total: 9.995,
      });

      expect(result).toEqual({
        order: 10.01,
        metamaskFee: 0.01,
        exchangeFee: 0.01,
        total: 9.99,
      });
      expect(result.order - result.metamaskFee - result.exchangeFee).toBe(
        result.total,
      );
    });

    it('uses remainder exchange fee when independently rounded sub-cent fees would miss the total', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.BUY,
        order: 10.001,
        metamaskFee: 0.001,
        total: 10.02,
      });

      expect(result.depositFee).toBeUndefined();
      expect(result).toEqual({
        order: 10.01,
        metamaskFee: 0.01,
        exchangeFee: 0,
        total: 10.02,
      });
      expect(result.order + result.metamaskFee + result.exchangeFee).toBe(
        result.total,
      );
    });

    it('returns zero buy rows when stake and total are zero', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.BUY,
        order: 0,
        metamaskFee: 0.5,
        total: 0,
      });

      expect(result).toEqual({
        order: 0,
        metamaskFee: 0,
        exchangeFee: 0,
        total: 0,
      });
    });

    it('omits depositFee when the input is zero', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.BUY,
        order: 10,
        metamaskFee: 0.1,
        depositFee: 0,
        total: 10.2,
      });

      expect(result.depositFee).toBeUndefined();
      expect(result.order + result.metamaskFee + result.exchangeFee).toBe(
        result.total,
      );
    });

    it('keeps buy exchange fee non-negative when rounded rows exceed the total', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.BUY,
        order: 10.001,
        metamaskFee: 0.004,
        total: 10.01,
      });

      expect(result.exchangeFee).toBeGreaterThanOrEqual(0);
      expect(result).toEqual({
        order: 10,
        metamaskFee: 0.01,
        exchangeFee: 0,
        total: 10.01,
      });
      expect(result.order + result.metamaskFee + result.exchangeFee).toBe(
        result.total,
      );
    });

    it('keeps sell exchange fee non-negative when rounded fees exceed the spread', () => {
      const result = buildPredictFeeBreakdownAmounts({
        side: Side.SELL,
        order: 10.019,
        metamaskFee: 0.02,
        total: 10,
      });

      expect(result.exchangeFee).toBeGreaterThanOrEqual(0);
      expect(result.order - result.metamaskFee - result.exchangeFee).toBe(
        result.total,
      );
    });
  });
});
