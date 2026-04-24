import { hyperLiquidModeFoldsSpot } from './hyperliquid-types';

describe('hyperLiquidModeFoldsSpot', () => {
  it('returns true for unifiedAccount (spot is unified with perps)', () => {
    expect(hyperLiquidModeFoldsSpot('unifiedAccount')).toBe(true);
  });

  it('returns true for portfolioMargin (spot borrows against perps collateral)', () => {
    expect(hyperLiquidModeFoldsSpot('portfolioMargin')).toBe(true);
  });

  it('returns true for default (app.hyperliquid.xyz defaults to unifiedAccount)', () => {
    expect(hyperLiquidModeFoldsSpot('default')).toBe(true);
  });

  it('returns false for disabled (Standard mode; spot is a separate ledger)', () => {
    expect(hyperLiquidModeFoldsSpot('disabled')).toBe(false);
  });

  it('returns false for dexAbstraction (deprecated; treats USDC as perps, other collateral as spot with no fold)', () => {
    expect(hyperLiquidModeFoldsSpot('dexAbstraction')).toBe(false);
  });

  it('returns true when mode is unknown (null) — fallback to Unified default', () => {
    expect(hyperLiquidModeFoldsSpot(null)).toBe(true);
  });

  it('returns true when mode is undefined — fallback to Unified default', () => {
    expect(hyperLiquidModeFoldsSpot(undefined)).toBe(true);
  });
});
