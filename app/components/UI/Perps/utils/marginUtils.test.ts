import {
  assessMarginRemovalRisk,
  calculateMaxRemovableMargin,
  calculateNewLiquidationPrice,
  estimateLiquidationPrice,
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
      // For 50x position leverage: initial margin = 2%, but 10% is higher
      const result = calculateMaxRemovableMargin({
        currentMargin: 3000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 50,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 50 = 400 (2%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // transferMarginRequired = max(400, 2000) = 2000
      // maxRemovable = 3000 - 2000 = 1000
      expect(result).toBe(1000);
    });

    it('uses leverage-based minimum when it exceeds 10% (low leverage)', () => {
      // For 5x position leverage: initial margin = 20%, which is > 10%
      const result = calculateMaxRemovableMargin({
        currentMargin: 5000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 5,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 5 = 4000 (20%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // transferMarginRequired = max(4000, 2000) = 4000
      // maxRemovable = 5000 - 4000 = 1000
      expect(result).toBe(1000);
    });

    it('uses current price (mark price) per Hyperliquid docs', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 6000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2500, // Higher than entry
        positionLeverage: 5,
      });

      // Uses currentPrice (2500) - mark price per Hyperliquid docs
      // notionalValue = 10 * 2500 = 25000
      // initialMarginRequired = 25000 / 5 = 5000 (20%)
      // tenPercentMargin = 25000 * 0.1 = 2500 (10%)
      // transferMarginRequired = max(5000, 2500) = 5000
      // maxRemovable = 6000 - 5000 = 1000
      expect(result).toBe(1000);
    });

    it('allows margin removal when current margin exceeds transfer margin required', () => {
      // User has 8000 margin for a position requiring 2000 minimum
      const result = calculateMaxRemovableMargin({
        currentMargin: 8000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 50,
      });

      // notionalValue = 10 * 2000 = 20000
      // initialMarginRequired = 20000 / 50 = 400 (2%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // transferMarginRequired = max(400, 2000) = 2000
      // maxRemovable = 8000 - 2000 = 6000
      expect(result).toBe(6000);
    });

    it('correctly calculates for position at exact initial margin (no removable)', () => {
      // Position at 10x leverage with exactly the required margin
      // $1000 notional, $100 margin (10% = initial margin at 10x)
      const result = calculateMaxRemovableMargin({
        currentMargin: 100,
        positionSize: 0.01,
        entryPrice: 100000,
        currentPrice: 100000,
        positionLeverage: 10,
      });

      // notionalValue = 0.01 * 100000 = 1000
      // initialMarginRequired = 1000 / 10 = 100 (10%)
      // tenPercentMargin = 1000 * 0.1 = 100 (10%)
      // transferMarginRequired = max(100, 100) = 100
      // maxRemovable = 100 - 100 = 0
      expect(result).toBe(0);
    });

    it('does not include unrealized PnL in withdrawal calculation', () => {
      // Per Hyperliquid docs: unrealized PnL helps prevent liquidation
      // but doesn't increase withdrawal limits
      // Position at exact initial margin - nothing removable
      const result = calculateMaxRemovableMargin({
        currentMargin: 100,
        positionSize: 0.01,
        entryPrice: 100000,
        currentPrice: 100000,
        positionLeverage: 10,
      });

      // notionalValue = 0.01 * 100000 = 1000
      // initialMarginRequired = 1000 / 10 = 100
      // tenPercentMargin = 1000 * 0.1 = 100
      // transferMarginRequired = max(100, 100) = 100
      // maxRemovable = 100 - 100 = 0
      // Even if position has positive unrealized PnL, it's not withdrawable
      expect(result).toBe(0);
    });

    it('returns 0 for negative margin values', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: -100,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when position size is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 0,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when position leverage is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 0,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when current price is 0 and no notionalValue provided', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 500,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 0,
        positionLeverage: 50,
      });

      expect(result).toBe(0);
    });

    it('uses provided notionalValue when currentPrice is 0', () => {
      // Simulates when live price hasn't loaded yet but we have position.positionValue
      const result = calculateMaxRemovableMargin({
        currentMargin: 3000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 0, // Live price not loaded
        positionLeverage: 50,
        notionalValue: 20000, // From position.positionValue
      });

      // notionalValue = 20000 (provided)
      // initialMarginRequired = 20000 / 50 = 400 (2%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // transferMarginRequired = max(400, 2000) = 2000
      // maxRemovable = 3000 - 2000 = 1000
      expect(result).toBe(1000);
    });

    it('uses calculated notionalValue when provided value is 0', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 3000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2000,
        positionLeverage: 50,
        notionalValue: 0, // Invalid, should fall back to calculated
      });

      // Falls back to: notionalValue = 10 * 2000 = 20000
      // Same calculation as above
      expect(result).toBe(1000);
    });

    it('prefers provided notionalValue over calculated when both available', () => {
      const result = calculateMaxRemovableMargin({
        currentMargin: 5000,
        positionSize: 10,
        entryPrice: 2000,
        currentPrice: 2500, // Would give notional of 25000
        positionLeverage: 5,
        notionalValue: 20000, // Provided value takes precedence
      });

      // Uses provided notionalValue = 20000
      // initialMarginRequired = 20000 / 5 = 4000 (20%)
      // tenPercentMargin = 20000 * 0.1 = 2000 (10%)
      // transferMarginRequired = max(4000, 2000) = 4000
      // maxRemovable = 5000 - 4000 = 1000
      expect(result).toBe(1000);
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

  describe('estimateLiquidationPrice', () => {
    it('returns current liquidation price when no margin change', () => {
      const result = estimateLiquidationPrice({
        isLong: true,
        currentMargin: 5000,
        newMargin: 5000,
        positionSize: 0.5,
        currentLiquidationPrice: 80000,
        maxLeverage: 20,
      });

      expect(result).toBe(80000);
    });

    it('applies maintenance factor when adding margin (long)', () => {
      // Adding $1000 margin to long position
      // maxLeverage=20 => l=0.025 => denominator=0.975
      // delta=+1000, move = -1000/0.5/0.975 = -2051.28
      // new liq = 80000 - 2051.28 = 77948.72
      const result = estimateLiquidationPrice({
        isLong: true,
        currentMargin: 5000,
        newMargin: 6000,
        positionSize: 0.5,
        currentLiquidationPrice: 80000,
        maxLeverage: 20,
      });

      expect(result).toBeCloseTo(77948.72, 0);
    });

    it('applies maintenance factor when removing margin (long)', () => {
      // Removing $1000 margin from long position
      // delta=-1000, move = +1000/0.5/0.975 = +2051.28
      // new liq = 80000 + 2051.28 = 82051.28
      const result = estimateLiquidationPrice({
        isLong: true,
        currentMargin: 5000,
        newMargin: 4000,
        positionSize: 0.5,
        currentLiquidationPrice: 80000,
        maxLeverage: 20,
      });

      expect(result).toBeCloseTo(82051.28, 0);
    });

    it('applies maintenance factor for short position', () => {
      // Removing $500 margin from short position
      // maxLeverage=20 => l=0.025 => denominator=1.025 (for short)
      // delta=-500, move = -500/10/1.025 = -48.78
      // new liq = 2100 - 48.78 = 2051.22
      const result = estimateLiquidationPrice({
        isLong: false,
        currentMargin: 1000,
        newMargin: 500,
        positionSize: 10,
        currentLiquidationPrice: 2100,
        maxLeverage: 20,
      });

      expect(result).toBeCloseTo(2051.22, 0);
    });

    it('returns currentLiquidationPrice when newMargin is invalid', () => {
      expect(
        estimateLiquidationPrice({
          isLong: true,
          currentMargin: 5000,
          newMargin: 0,
          positionSize: 0.5,
          currentLiquidationPrice: 80000,
          maxLeverage: 20,
        }),
      ).toBe(80000);
    });

    it('returns currentLiquidationPrice when positionSize is invalid', () => {
      expect(
        estimateLiquidationPrice({
          isLong: true,
          currentMargin: 5000,
          newMargin: 6000,
          positionSize: 0,
          currentLiquidationPrice: 80000,
          maxLeverage: 20,
        }),
      ).toBe(80000);
    });

    it('falls back to no maintenance factor when maxLeverage is invalid', () => {
      // Without maintenance factor: move = -1000/0.5/1 = -2000
      // new liq = 80000 - 2000 = 78000
      const result = estimateLiquidationPrice({
        isLong: true,
        currentMargin: 5000,
        newMargin: 6000,
        positionSize: 0.5,
        currentLiquidationPrice: 80000,
        maxLeverage: 0,
      });

      expect(result).toBe(78000);
    });
  });
});
