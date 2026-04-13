import { ONDO_RESTRICTED_COUNTRIES } from './ondoGeoRestrictions';

describe('ONDO_RESTRICTED_COUNTRIES', () => {
  it('is a Set', () => {
    expect(ONDO_RESTRICTED_COUNTRIES).toBeInstanceOf(Set);
  });

  it('contains well-known sanctioned/restricted countries', () => {
    const alwaysRestricted = ['US', 'GB', 'CA', 'CN', 'RU', 'IR', 'KP', 'SY'];
    for (const country of alwaysRestricted) {
      expect(ONDO_RESTRICTED_COUNTRIES.has(country)).toBe(true);
    }
  });

  it('contains all EU member states', () => {
    const euMembers = [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
    ];
    for (const country of euMembers) {
      expect(ONDO_RESTRICTED_COUNTRIES.has(country)).toBe(true);
    }
  });

  it('contains EEA non-EU countries', () => {
    expect(ONDO_RESTRICTED_COUNTRIES.has('IS')).toBe(true);
    expect(ONDO_RESTRICTED_COUNTRIES.has('LI')).toBe(true);
    expect(ONDO_RESTRICTED_COUNTRIES.has('NO')).toBe(true);
  });

  it('does not contain non-restricted countries', () => {
    const allowed = ['AU', 'AR', 'JP', 'MX', 'ZA', 'IN'];
    for (const country of allowed) {
      expect(ONDO_RESTRICTED_COUNTRIES.has(country)).toBe(false);
    }
  });

  it('uses two-letter ISO 3166-1 alpha-2 codes (all uppercase, 2 chars)', () => {
    for (const code of ONDO_RESTRICTED_COUNTRIES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('has no duplicate entries (Set guarantees uniqueness)', () => {
    const asArray = Array.from(ONDO_RESTRICTED_COUNTRIES);
    expect(asArray.length).toBe(new Set(asArray).size);
  });
});
