import {
  calculateLiquidationDistance,
  clampLiquidationDistance,
  LIQUIDATION_DISTANCE_FULL_THRESHOLD,
} from './liquidationDistance';

describe('calculateLiquidationDistance', () => {
  it('returns the distance as a percentage of the current price', () => {
    expect(calculateLiquidationDistance(100, 80)).toBe(20);
  });

  it('is direction agnostic', () => {
    expect(calculateLiquidationDistance(100, 120)).toBe(20);
  });

  it('returns 0 when either price is missing or zero', () => {
    expect(calculateLiquidationDistance(0, 80)).toBe(0);
    expect(calculateLiquidationDistance(100, 0)).toBe(0);
    expect(calculateLiquidationDistance(NaN, 80)).toBe(0);
  });
});

describe('clampLiquidationDistance', () => {
  it('rounds up to 100 at the threshold', () => {
    expect(clampLiquidationDistance(LIQUIDATION_DISTANCE_FULL_THRESHOLD)).toBe(
      100,
    );
  });

  it('rounds up to 100 above the threshold', () => {
    expect(clampLiquidationDistance(99.99)).toBe(100);
  });

  it('leaves distances below the threshold untouched', () => {
    expect(clampLiquidationDistance(99.8)).toBe(99.8);
    expect(clampLiquidationDistance(12.5)).toBe(12.5);
  });
});
