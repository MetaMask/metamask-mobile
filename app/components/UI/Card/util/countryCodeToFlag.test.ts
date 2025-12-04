import { countryCodeToFlag } from './countryCodeToFlag';

describe('countryCodeToFlag', () => {
  describe('valid country codes', () => {
    it('returns US flag emoji for US country code', () => {
      const isoCode = 'US';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇺🇸');
    });

    it('returns GB flag emoji for GB country code', () => {
      const isoCode = 'GB';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇬🇧');
    });

    it('returns DE flag emoji for DE country code', () => {
      const isoCode = 'DE';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇩🇪');
    });

    it('returns JP flag emoji for JP country code', () => {
      const isoCode = 'JP';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇯🇵');
    });

    it('returns FR flag emoji for FR country code', () => {
      const isoCode = 'FR';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇫🇷');
    });

    it('returns CA flag emoji for CA country code', () => {
      const isoCode = 'CA';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇨🇦');
    });

    it('returns BR flag emoji for BR country code', () => {
      const isoCode = 'BR';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇧🇷');
    });

    it('returns AU flag emoji for AU country code', () => {
      const isoCode = 'AU';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇦🇺');
    });
  });

  describe('lowercase country codes', () => {
    it('returns US flag emoji for lowercase us country code', () => {
      const isoCode = 'us';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇺🇸');
    });

    it('returns GB flag emoji for lowercase gb country code', () => {
      const isoCode = 'gb';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇬🇧');
    });

    it('returns DE flag emoji for mixed case De country code', () => {
      const isoCode = 'De';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🇩🇪');
    });
  });

  describe('edge cases', () => {
    it('returns globe emoji for null country code', () => {
      const isoCode = null;

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for undefined country code', () => {
      const isoCode = undefined;

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for empty string country code', () => {
      const isoCode = '';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for single character country code', () => {
      const isoCode = 'U';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for three character country code', () => {
      const isoCode = 'USA';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for numeric country code', () => {
      const isoCode = '12';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for special characters country code', () => {
      const isoCode = '@#';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for country code with space', () => {
      const isoCode = 'U ';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });

    it('returns globe emoji for alphanumeric country code', () => {
      const isoCode = 'U1';

      const result = countryCodeToFlag(isoCode);

      expect(result).toBe('🌍');
    });
  });
});
