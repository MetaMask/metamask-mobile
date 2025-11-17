import { GEO_BLOCKED_COUNTRIES } from './geoblock';

describe('GEO_BLOCKED_COUNTRIES', () => {
  it('contains DE', () => {
    const hasDE = GEO_BLOCKED_COUNTRIES.some(
      (region) => region.country === 'DE',
    );

    expect(hasDE).toBe(true);
  });

  it('contains RO', () => {
    const hasRO = GEO_BLOCKED_COUNTRIES.some(
      (region) => region.country === 'RO',
    );

    expect(hasRO).toBe(true);
  });

  it('has exactly 2 entries', () => {
    expect(GEO_BLOCKED_COUNTRIES).toHaveLength(2);
  });

  it('has country property for each entry', () => {
    GEO_BLOCKED_COUNTRIES.forEach((region) => {
      expect(region).toHaveProperty('country');
      expect(typeof region.country).toBe('string');
    });
  });
});
