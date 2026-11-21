import { assessMarginRemovalRisk } from './marginUtils';

describe('marginUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
