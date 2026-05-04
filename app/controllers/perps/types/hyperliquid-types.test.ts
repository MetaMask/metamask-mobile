import { hyperLiquidModeFoldsSpot } from './hyperliquid-types';

describe('hyperLiquidModeFoldsSpot', () => {
  it('folds for unifiedAccount', () => {
    expect(hyperLiquidModeFoldsSpot('unifiedAccount')).toBe(true);
  });

  it('folds for portfolioMargin', () => {
    expect(hyperLiquidModeFoldsSpot('portfolioMargin')).toBe(true);
  });

  it('does not fold for dexAbstraction', () => {
    expect(hyperLiquidModeFoldsSpot('dexAbstraction')).toBe(false);
  });

  it('does not fold for default', () => {
    expect(hyperLiquidModeFoldsSpot('default')).toBe(false);
  });

  it('does not fold for disabled', () => {
    expect(hyperLiquidModeFoldsSpot('disabled')).toBe(false);
  });

  it('fail-closes (no fold) when mode is null', () => {
    // Critical: must not over-report withdrawable funds for Standard /
    // dexAbstraction users when the abstraction mode hasn't been resolved
    // yet (e.g. WS spot push arrives before REST userAbstraction completes).
    expect(hyperLiquidModeFoldsSpot(null)).toBe(false);
  });

  it('fail-closes (no fold) when mode is undefined', () => {
    expect(hyperLiquidModeFoldsSpot(undefined)).toBe(false);
  });
});
