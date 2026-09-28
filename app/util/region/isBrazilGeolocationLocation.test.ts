import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isBrazilGeolocationLocation } from './isBrazilGeolocationLocation';

describe('isBrazilGeolocationLocation', () => {
  it('returns true for the Brazil country code', () => {
    expect(isBrazilGeolocationLocation('BR')).toBe(true);
  });

  it('returns true for a Brazil region code', () => {
    expect(isBrazilGeolocationLocation('BR-SP')).toBe(true);
  });

  it('returns true for lowercase Brazil codes', () => {
    expect(isBrazilGeolocationLocation('br-rj')).toBe(true);
  });

  it('returns false for non-Brazil country codes', () => {
    expect(isBrazilGeolocationLocation('US')).toBe(false);
  });

  it('returns false for an unknown location', () => {
    expect(isBrazilGeolocationLocation(UNKNOWN_LOCATION)).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isBrazilGeolocationLocation(undefined)).toBe(false);
  });

  it('returns false when location is null', () => {
    expect(isBrazilGeolocationLocation(null)).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isBrazilGeolocationLocation('')).toBe(false);
  });
});
