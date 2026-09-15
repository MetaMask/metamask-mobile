import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isEuGeolocationLocation } from './isEuGeolocationLocation';

describe('isEuGeolocationLocation', () => {
  it('returns true for an EU country code', () => {
    expect(isEuGeolocationLocation('DE')).toBe(true);
  });

  it('returns true for an EU region code', () => {
    expect(isEuGeolocationLocation('FR-IDF')).toBe(true);
  });

  it('returns true for lowercase EU codes', () => {
    expect(isEuGeolocationLocation('nl')).toBe(true);
  });

  it('returns false for the United Kingdom', () => {
    expect(isEuGeolocationLocation('GB')).toBe(false);
  });

  it('returns false for the United States', () => {
    expect(isEuGeolocationLocation('US')).toBe(false);
  });

  it('returns false for unknown location', () => {
    expect(isEuGeolocationLocation(UNKNOWN_LOCATION)).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isEuGeolocationLocation(undefined)).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isEuGeolocationLocation('')).toBe(false);
  });
});
