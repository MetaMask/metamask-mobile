import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isVbaRegionSupported } from './isVbaRegionSupported';

describe('isVbaRegionSupported', () => {
  it('returns true for a supported country code', () => {
    expect(isVbaRegionSupported('BR')).toBe(true);
  });

  it('returns true for a supported country subdivision', () => {
    expect(isVbaRegionSupported('BR-SP')).toBe(true);
  });

  it('returns true for lowercase location codes', () => {
    expect(isVbaRegionSupported('br-rj')).toBe(true);
  });

  it('returns false for an unsupported country code', () => {
    expect(isVbaRegionSupported('US')).toBe(false);
  });

  it('returns false for an unknown location', () => {
    expect(isVbaRegionSupported(UNKNOWN_LOCATION)).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isVbaRegionSupported(undefined)).toBe(false);
  });

  it('returns false when location is null', () => {
    expect(isVbaRegionSupported(null)).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isVbaRegionSupported('')).toBe(false);
  });
});
