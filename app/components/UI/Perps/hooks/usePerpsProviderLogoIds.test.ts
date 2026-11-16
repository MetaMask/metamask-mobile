import { getPerpsProviderLogoIds } from './usePerpsProviderLogoIds';

describe('getPerpsProviderLogoIds', () => {
  it('returns the Hyperliquid mark for the Hyperliquid provider', () => {
    expect(getPerpsProviderLogoIds('hyperliquid')).toEqual(['hyperliquid']);
  });

  it('returns the Lighter mark for the Lighter provider', () => {
    expect(getPerpsProviderLogoIds('lighter')).toEqual(['lighter']);
  });

  it('returns Hyperliquid then Lighter for aggregated mode', () => {
    expect(getPerpsProviderLogoIds('aggregated')).toEqual([
      'hyperliquid',
      'lighter',
    ]);
  });

  it('returns no marks when the provider is missing', () => {
    expect(getPerpsProviderLogoIds(undefined)).toEqual([]);
  });
});
