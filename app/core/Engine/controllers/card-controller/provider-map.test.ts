import {
  getProviderForCountry,
  getSupportedCountries,
  deriveCountryProviderMap,
  type CountryProviderMap,
} from './provider-map';
import { CardProviderIds } from './provider-types';

const SAMPLE_MAP: CountryProviderMap = {
  US: CardProviderIds.Baanx,
  GB: CardProviderIds.Baanx,
  DE: CardProviderIds.Immersve,
};

describe('provider-map', () => {
  describe('getProviderForCountry', () => {
    it('returns the mapped provider for a known country', () => {
      expect(getProviderForCountry('US', SAMPLE_MAP)).toBe(
        CardProviderIds.Baanx,
      );
    });

    it('returns a different provider when mapped', () => {
      expect(getProviderForCountry('DE', SAMPLE_MAP)).toBe(
        CardProviderIds.Immersve,
      );
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

      const map = deriveCountryProviderMap(featureFlag, CardProviderIds.Baanx);

      expect(map).toStrictEqual({
        US: CardProviderIds.Baanx,
        GB: CardProviderIds.Baanx,
      });
    });

    it('excludes disabled countries', () => {
      const featureFlag = { US: true, JP: false };

      const map = deriveCountryProviderMap(featureFlag, CardProviderIds.Baanx);

      expect(map.JP).toBeUndefined();
    });

    it('maps all enabled countries to the given provider', () => {
      const featureFlag = { US: true, GB: true, JP: true };

      const map = deriveCountryProviderMap(
        featureFlag,
        CardProviderIds.Immersve,
      );

      expect(map).toStrictEqual({
        US: CardProviderIds.Immersve,
        GB: CardProviderIds.Immersve,
        JP: CardProviderIds.Immersve,
      });
    });

    it('returns empty map when no countries are enabled', () => {
      expect(deriveCountryProviderMap({}, CardProviderIds.Baanx)).toStrictEqual(
        {},
      );
    });
  });
});
