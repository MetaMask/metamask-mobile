import { mapCountryToLocation } from './mapCountryToLocation';
import { CardLocation } from '../types';

describe('mapCountryToLocation', () => {
  describe('US country code', () => {
    it('returns us location for US country code', () => {
      const countryCode = 'US';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('us' as CardLocation);
    });
  });

  describe('non-US country codes', () => {
    it('returns international location for GB country code', () => {
      const countryCode = 'GB';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for CA country code', () => {
      const countryCode = 'CA';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for DE country code', () => {
      const countryCode = 'DE';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for FR country code', () => {
      const countryCode = 'FR';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for JP country code', () => {
      const countryCode = 'JP';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });
  });

  describe('edge cases', () => {
    it('returns international location for null country code', () => {
      const countryCode = null;

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for empty string country code', () => {
      const countryCode = '';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for lowercase us country code', () => {
      const countryCode = 'us';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for mixed case Us country code', () => {
      const countryCode = 'Us';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for invalid country code', () => {
      const countryCode = 'INVALID';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for numeric string', () => {
      const countryCode = '123';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });

    it('returns international location for special characters', () => {
      const countryCode = '@#$';

      const result = mapCountryToLocation(countryCode);

      expect(result).toBe('international' as CardLocation);
    });
  });
});
