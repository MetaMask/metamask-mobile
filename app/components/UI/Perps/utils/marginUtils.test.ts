import {
  assessMarginRemovalRisk,
  calculateMaxRemovableMargin,
  calculateNewLiquidationPrice,
} from './marginUtils';

describe('marginUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateMaxRemovableMargin', () => {
    it('uses 10% minimum when it exceeds leverage-based minimum (high leverage)', () => {
      // For 50x leverage: initial margin = 2%, but 10% is higher
      const result = calculateMaxRemovableMargin({
        currentMargin: 1000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 50,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 50 = 400 (2%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // baseMinimumRequired = max(400, 2000) = 2000
      // minimumMarginRequired = 2000 * 3 = 6000 (with 3x safety buffer)
      // maxRemovable = 1000 - 6000 = -5000 -> 0 (capped)
      expect(result).toBe(0);
    });

    it('uses leverage-based minimum when it exceeds 10% (low leverage)', () => {
      // For 5x leverage: initial margin = 20%, which is > 10%
      const result = calculateMaxRemovableMargin({
        currentMargin: 15000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 5,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 5 = 4000 (20%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // baseMinimumRequired = max(4000, 2000) = 4000
      // minimumMarginRequired = 4000 * 3 = 12000 (with 3x safety buffer)
      // maxRemovable = 15000 - 12000 = 3000
      expect(result).toBe(3000);
    });

    it('uses higher of entry and current price for conservative calculation', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 20000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2500, // Higher than entry
        maxLeverage: 5,
      });

      // Uses currentPrice (2500) since it's higher
      // notionalValue = 10 * 2500 = 25000
      // initialMarginRequired = 25000 / 5 = 5000 (20%)
      // tenPercentMargin = 25000 * 0.1 = 2500 (10%)
      // baseMinimumRequired = max(5000, 2500) = 5000
      // minimumMarginRequired = 5000 * 3 = 15000 (with 3x safety buffer)
      // maxRemovable = 20000 - 15000 = 5000
      expect(result).toBe(5000);
    });

    it('allows margin removal when current margin exceeds minimum with safety buffer', () => {
      // User has 8000 margin for a position requiring 6000 minimum (with buffer)
      const result = calculateMaxRemovableMargin({
        currentMargin: 8000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 50,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 50 = 400 (2%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // baseMinimumRequired = max(400, 2000) = 2000
      // minimumMarginRequired = 2000 * 3 = 6000 (with 3x safety buffer)
      // maxRemovable = 8000 - 6000 = 2000
      expect(result).toBe(2000);
    });

    it('correctly limits small positions (real-world scenario)', () => {
      // Real scenario: ~$10.39 notional, $3.50 margin, 3x leverage
      const result = calculateMaxRemovableMargin({
        currentMargin: 3.5,
        positionSize: 0.1,
        entryPrice: 103.9,
        currentPrice: 103.9,
        maxLeverage: 3,
      });

      // notionalValue = 0.1 * 103.9 = 10.39
      // initialMarginRequired = 10.39 / 3 = 3.46 (33%)
      // tenPercentMargin = 10.39 * 0.1 = 1.04 (10%)
      // baseMinimumRequired = max(3.46, 1.04) = 3.46
      // minimumMarginRequired = 3.46 * 3 = 10.38 (with 3x safety buffer)
      // maxRemovable = 3.5 - 10.38 = -6.88 -> 0 (capped)
      // With only 3.5 margin at 3x leverage, no margin can be removed!
      expect(result).toBe(0);
    });

    it('returns 0 for negative margin values', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: -100,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when position size is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 0,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when max leverage is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        maxLeverage: 0,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when entry price is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 10,
        entryPrice: 0,
        currentPrice: 2000,
        maxLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when current price is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 0,
        maxLeverage: 50,
      });

      expect(result).toBe(0);
    });
  });

  describe('calculateNewLiquidationPrice', () => {
    it('calculates liquidation price below entry for long position', () => {
      const newMargin = 200;
      const positionSize = 10;
      const entryPrice = 2000;
      const isLong = true;
      const currentLiquidationPrice = 1900;
      const expectedMarginPerUnit = newMargin / positionSize; // 20
      const expectedLiquidation = entryPrice - expectedMarginPerUnit; // 1980

      const result = calculateNewLiquidationPrice({
        newMargin,
        positionSize,
        entryPrice,
        isLong,
        currentLiquidationPrice,
      });

      expect(result).toBe(expectedLiquidation);
    });

    it('calculates liquidation price above entry for short position', () => {
      const newMargin = 200;
      const positionSize = 10;
      const entryPrice = 2000;
      const isLong = false;
      const currentLiquidationPrice = 2100;
      const expectedMarginPerUnit = newMargin / positionSize; // 20
      const expectedLiquidation = entryPrice + expectedMarginPerUnit; // 2020

      const result = calculateNewLiquidationPrice({
        newMargin,
        positionSize,
        entryPrice,
        isLong,
        currentLiquidationPrice,
      });

      expect(result).toBe(expectedLiquidation);
    });

    it('returns current liquidation price when new margin is 0', () => {
      const newMargin = 0;
      const positionSize = 10;
      const entryPrice = 2000;
      const isLong = true;
      const currentLiquidationPrice = 1900;

      const result = calculateNewLiquidationPrice({
        newMargin,
        positionSize,
        entryPrice,
        isLong,
        currentLiquidationPrice,
      });

      expect(result).toBe(currentLiquidationPrice);
    });

    it('returns current liquidation price when position size is 0', () => {
      const newMargin = 200;
      const positionSize = 0;
      const entryPrice = 2000;
      const isLong = true;
      const currentLiquidationPrice = 1900;

      const result = calculateNewLiquidationPrice({
        newMargin,
        positionSize,
        entryPrice,
        isLong,
        currentLiquidationPrice,
      });

      expect(result).toBe(currentLiquidationPrice);
    });

    it('returns 0 for long position when liquidation would be negative', () => {
      const newMargin = 25000; // Very high margin
      const positionSize = 10;
      const entryPrice = 2000;
      const isLong = true;
      const currentLiquidationPrice = 1900;

      const result = calculateNewLiquidationPrice({
        newMargin,
        positionSize,
        entryPrice,
        isLong,
        currentLiquidationPrice,
      });

      expect(result).toBe(0);
    });
  });

  describe('assessMarginRemovalRisk', () => {
    it('returns danger risk level when buffer is below 20%', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = 1900;
      const isLong = true;
      const priceDiff = currentPrice - newLiquidationPrice; // 100
      const riskRatio = priceDiff / newLiquidationPrice; // 0.0526 (5.26%)

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('danger');
      expect(result.priceDiff).toBe(priceDiff);
      expect(result.riskRatio).toBeCloseTo(riskRatio, 4);
    });

    it('returns warning risk level when buffer is between 20% and 50%', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = 1600;
      const isLong = true;
      const priceDiff = currentPrice - newLiquidationPrice; // 400
      const riskRatio = priceDiff / newLiquidationPrice; // 0.25 (25%)

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('warning');
      expect(result.priceDiff).toBe(priceDiff);
      expect(result.riskRatio).toBe(riskRatio);
    });

    it('returns safe risk level when buffer is above 50%', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = 1200;
      const isLong = true;
      const priceDiff = currentPrice - newLiquidationPrice; // 800
      const riskRatio = priceDiff / newLiquidationPrice; // 0.6667 (66.67%)

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('safe');
      expect(result.priceDiff).toBe(priceDiff);
      expect(result.riskRatio).toBeCloseTo(riskRatio, 4);
    });

    it('returns danger when liquidation price equals current price', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = 2000;
      const isLong = true;

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('danger');
      expect(result.priceDiff).toBe(0);
      expect(result.riskRatio).toBe(0);
    });

    it('calculates correct price difference for short position', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = 2600;
      const isLong = false;
      const expectedPriceDiff = newLiquidationPrice - currentPrice; // 600
      const expectedRiskRatio = expectedPriceDiff / newLiquidationPrice; // 0.2308

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.priceDiff).toBe(expectedPriceDiff);
      expect(result.riskRatio).toBeCloseTo(expectedRiskRatio, 4);
    });

    it('returns safe risk assessment when liquidation price is NaN', () => {
      const currentPrice = 2000;
      const newLiquidationPrice = NaN;
      const isLong = true;

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('safe');
      expect(result.priceDiff).toBe(0);
      expect(result.riskRatio).toBe(0);
    });

    it('returns safe risk assessment when current price is 0', () => {
      const currentPrice = 0;
      const newLiquidationPrice = 1900;
      const isLong = true;

      const result = assessMarginRemovalRisk({
        newLiquidationPrice,
        currentPrice,
        isLong,
      });

      expect(result.riskLevel).toBe('safe');
      expect(result.priceDiff).toBe(0);
      expect(result.riskRatio).toBe(0);
    });
  });
});
