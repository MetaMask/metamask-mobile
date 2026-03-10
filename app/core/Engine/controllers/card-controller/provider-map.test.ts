import {
  getProviderForCountry,
  getSupportedCountries,
  deriveCountryProviderMap,
  type CountryProviderMap,
} from './provider-map';

const SAMPLE_MAP: CountryProviderMap = {
  US: 'providerA',
  GB: 'providerA',
  DE: 'providerB',
};

describe('provider-map', () => {
  describe('getProviderForCountry', () => {
    it('returns the mapped provider for a known country', () => {
      expect(getProviderForCountry('US', SAMPLE_MAP)).toBe('providerA');
    });

    it('returns a different provider when mapped', () => {
      expect(getProviderForCountry('DE', SAMPLE_MAP)).toBe('providerB');
    });

    it('returns null for an unmapped country', () => {
      expect(getProviderForCountry('JP', SAMPLE_MAP)).toBeNull();
    });

    it('returns null for an empty map', () => {
      expect(getProviderForCountry('US', {})).toBeNull();
    });
  });

  describe('getSupportedCountries', () => {
    it('returns all country codes from the map', () => {
      const countries = getSupportedCountries(SAMPLE_MAP);

      expect(countries).toHaveLength(3);
      expect(countries).toContain('US');
      expect(countries).toContain('GB');
      expect(countries).toContain('DE');
    });

    it('returns empty array for empty map', () => {
      expect(getSupportedCountries({})).toHaveLength(0);
    });
  });

  describe('deriveCountryProviderMap', () => {
    it('maps enabled countries to the given provider', () => {
      const featureFlag = { US: true, GB: true, FR: false };

      const map = deriveCountryProviderMap(featureFlag, 'providerA');

      expect(map).toStrictEqual({ US: 'providerA', GB: 'providerA' });
    });

    it('excludes disabled countries', () => {
      const featureFlag = { US: true, JP: false };

      const map = deriveCountryProviderMap(featureFlag, 'providerA');

      expect(map.JP).toBeUndefined();
    });

    it('maps all enabled countries to the given provider', () => {
      const featureFlag = { US: true, GB: true, JP: true };

      const map = deriveCountryProviderMap(featureFlag, 'providerX');

      expect(map).toStrictEqual({
        US: 'providerX',
        GB: 'providerX',
        JP: 'providerX',
      });
    });

    it('returns empty map when no countries are enabled', () => {
      expect(deriveCountryProviderMap({}, 'providerA')).toStrictEqual({});
    });
  });
});
