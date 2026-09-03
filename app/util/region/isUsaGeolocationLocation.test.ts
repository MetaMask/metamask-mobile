import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isUsaGeolocationLocation } from './isUsaGeolocationLocation';

describe('isUsaGeolocationLocation', () => {
  it('returns true for US country code', () => {
    expect(isUsaGeolocationLocation('US')).toBe(true);
  });

  it('returns true for US state region code', () => {
    expect(isUsaGeolocationLocation('US-CA')).toBe(true);
  });

  it('returns true for lowercase US codes', () => {
    expect(isUsaGeolocationLocation('us-ny')).toBe(true);
  });

  it('returns false for non-US country codes', () => {
    expect(isUsaGeolocationLocation('GB')).toBe(false);
  });

  it('returns false for unknown location', () => {
    expect(isUsaGeolocationLocation(UNKNOWN_LOCATION)).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isUsaGeolocationLocation(undefined)).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isUsaGeolocationLocation('')).toBe(false);
  });
});
