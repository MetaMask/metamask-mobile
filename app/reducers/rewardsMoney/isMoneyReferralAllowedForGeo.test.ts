import {
  countryCodeFromGeoLocation,
  isMoneyReferralAllowedForGeo,
} from './isMoneyReferralAllowedForGeo';

describe('countryCodeFromGeoLocation', () => {
  it('returns the country prefix from a region-qualified location', () => {
    expect(countryCodeFromGeoLocation('US-CA')).toBe('US');
  });

  it('returns the uppercase country when already a country code', () => {
    expect(countryCodeFromGeoLocation('gb')).toBe('GB');
  });

  it('returns null for unknown or empty locations', () => {
    expect(countryCodeFromGeoLocation(null)).toBeNull();
    expect(countryCodeFromGeoLocation(undefined)).toBeNull();
    expect(countryCodeFromGeoLocation('')).toBeNull();
    expect(countryCodeFromGeoLocation('UNKNOWN')).toBeNull();
  });
});

describe('isMoneyReferralAllowedForGeo', () => {
  it('allows when geo is unknown', () => {
    expect(isMoneyReferralAllowedForGeo(null, ['GB'])).toBe(true);
    expect(isMoneyReferralAllowedForGeo('UNKNOWN', ['GB'])).toBe(true);
  });

  it('allows when the exclusion list is empty or missing', () => {
    expect(isMoneyReferralAllowedForGeo('GB', [])).toBe(true);
    expect(isMoneyReferralAllowedForGeo('GB', undefined)).toBe(true);
  });

  it('refuses when the country prefix is on the exclusion list', () => {
    expect(isMoneyReferralAllowedForGeo('GB', ['GB', 'US'])).toBe(false);
    expect(isMoneyReferralAllowedForGeo('US-CA', ['US'])).toBe(false);
  });

  it('allows when the country is not on the exclusion list', () => {
    expect(isMoneyReferralAllowedForGeo('DE', ['GB', 'US'])).toBe(true);
  });
});
