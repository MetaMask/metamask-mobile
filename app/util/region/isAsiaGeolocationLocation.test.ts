import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isAsiaGeolocationLocation } from './isAsiaGeolocationLocation';

describe('isAsiaGeolocationLocation', () => {
  it.each(['JP', 'KR', 'TW', 'CN', 'HK'])(
    'returns true for %s country code',
    (code) => {
      expect(isAsiaGeolocationLocation(code)).toBe(true);
    },
  );

  it('returns true for country-region code', () => {
    expect(isAsiaGeolocationLocation('CN-BJ')).toBe(true);
  });

  it('returns true for lowercase codes', () => {
    expect(isAsiaGeolocationLocation('jp')).toBe(true);
  });

  it('returns false for non-Asia country codes', () => {
    expect(isAsiaGeolocationLocation('US')).toBe(false);
    expect(isAsiaGeolocationLocation('GB')).toBe(false);
    expect(isAsiaGeolocationLocation('FR')).toBe(false);
  });

  it('returns false for unknown location', () => {
    expect(isAsiaGeolocationLocation(UNKNOWN_LOCATION)).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isAsiaGeolocationLocation(undefined)).toBe(false);
  });

  it('returns false when location is null', () => {
    expect(isAsiaGeolocationLocation(null)).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isAsiaGeolocationLocation('')).toBe(false);
  });
});
