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
    it('returns maximum removable margin for valid position', () => {
      const currentMargin = 500;
      const positionSize = 10;
      const entryPrice = 2000;
      const maxLeverage = 50;
      const expectedMinimum = (positionSize * entryPrice) / maxLeverage; // 400
      const expectedMax = currentMargin - expectedMinimum; // 100

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
      });

      expect(result).toBe(expectedMax);
    });

    it('returns 0 when current margin equals minimum required', () => {
      const positionSize = 10;
      const entryPrice = 2000;
      const maxLeverage = 50;
      const minimumMargin = (positionSize * entryPrice) / maxLeverage; // 400
      const currentMargin = minimumMargin;

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
      });

      expect(result).toBe(0);
    });

    it('returns 0 for negative margin values', () => {
      const currentMargin = -100;
      const positionSize = 10;
      const entryPrice = 2000;
      const maxLeverage = 50;

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when position size is 0', () => {
      const currentMargin = 500;
      const positionSize = 0;
      const entryPrice = 2000;
      const maxLeverage = 50;

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when max leverage is 0', () => {
      const currentMargin = 500;
      const positionSize = 10;
      const entryPrice = 2000;
      const maxLeverage = 0;

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when entry price is 0', () => {
      const currentMargin = 500;
      const positionSize = 10;
      const entryPrice = 0;
      const maxLeverage = 50;

      const result = calculateMaxRemovableMargin({
        currentMargin,
        positionSize,
        entryPrice,
        maxLeverage,
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
