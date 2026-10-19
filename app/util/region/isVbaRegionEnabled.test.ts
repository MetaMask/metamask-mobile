import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isVbaRegionEnabled } from './isVbaRegionEnabled';

describe('isVbaRegionEnabled', () => {
  it('returns true when the country code is in the region list', () => {
    expect(isVbaRegionEnabled('BR', ['BR'])).toBe(true);
  });

  it('returns true for a listed country subdivision', () => {
    expect(isVbaRegionEnabled('BR-SP', ['BR'])).toBe(true);
  });

  it('returns true for a lowercase location code', () => {
    expect(isVbaRegionEnabled('br-rj', ['BR'])).toBe(true);
  });

  it('returns true when the listed region code is lowercase', () => {
    expect(isVbaRegionEnabled('BR', ['br'])).toBe(true);
  });

  it('returns true for a US location when US is listed', () => {
    expect(isVbaRegionEnabled('US', ['BR', 'US'])).toBe(true);
  });

  it('returns true for a US subdivision when US is listed', () => {
    expect(isVbaRegionEnabled('US-CA', ['US'])).toBe(true);
  });

  it('returns false when the country is not in the region list', () => {
    expect(isVbaRegionEnabled('US', ['BR'])).toBe(false);
  });

  it('returns false when the region list is empty', () => {
    expect(isVbaRegionEnabled('BR', [])).toBe(false);
  });

  it('returns false for an unknown location', () => {
    expect(isVbaRegionEnabled(UNKNOWN_LOCATION, ['BR'])).toBe(false);
  });

  it('returns false when location is undefined', () => {
    expect(isVbaRegionEnabled(undefined, ['BR'])).toBe(false);
  });

  it('returns false when location is null', () => {
    expect(isVbaRegionEnabled(null, ['BR'])).toBe(false);
  });

  it('returns false when location is empty', () => {
    expect(isVbaRegionEnabled('', ['BR'])).toBe(false);
  });

  it('compares the country segment, so a subdivision code in the list does not match', () => {
    expect(isVbaRegionEnabled('US-CA', ['US-CA'])).toBe(false);
  });
});
