import { HIP3_ASSET_MARKET_TYPES } from './hyperLiquidConfig';

describe('HIP3_ASSET_MARKET_TYPES', () => {
  it('classifies URNM as commodity (Sprott Uranium Miners ETF)', () => {
    expect(HIP3_ASSET_MARKET_TYPES['xyz:URNM']).toBe('commodity');
  });

  it('classifies USAR as equity (US equity fund)', () => {
    expect(HIP3_ASSET_MARKET_TYPES['xyz:USAR']).toBe('equity');
  });

  it('classifies known equities correctly', () => {
    expect(HIP3_ASSET_MARKET_TYPES['xyz:TSLA']).toBe('equity');
    expect(HIP3_ASSET_MARKET_TYPES['xyz:NVDA']).toBe('equity');
    expect(HIP3_ASSET_MARKET_TYPES['xyz:AAPL']).toBe('equity');
  });

  it('classifies known commodities correctly', () => {
    expect(HIP3_ASSET_MARKET_TYPES['xyz:GOLD']).toBe('commodity');
    expect(HIP3_ASSET_MARKET_TYPES['xyz:SILVER']).toBe('commodity');
    expect(HIP3_ASSET_MARKET_TYPES['xyz:URANIUM']).toBe('commodity');
  });

  it('classifies known forex pairs correctly', () => {
    expect(HIP3_ASSET_MARKET_TYPES['xyz:EUR']).toBe('forex');
    expect(HIP3_ASSET_MARKET_TYPES['xyz:JPY']).toBe('forex');
  });
});
