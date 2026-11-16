import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isCopyTradeAllowedForGeolocation } from './isCopyTradeAllowedForGeolocation';

describe('isCopyTradeAllowedForGeolocation', () => {
  it('returns true for a completed non-UK country', () => {
    expect(isCopyTradeAllowedForGeolocation('FR', 'complete')).toBe(true);
  });

  it('returns true for a completed country-region code outside the UK', () => {
    expect(isCopyTradeAllowedForGeolocation('US-CA', 'complete')).toBe(true);
  });

  it('returns false for a completed UK country code', () => {
    expect(isCopyTradeAllowedForGeolocation('GB', 'complete')).toBe(false);
  });

  it('returns false for a completed UK region code', () => {
    expect(isCopyTradeAllowedForGeolocation('gb-eng', 'complete')).toBe(false);
  });

  it('returns false while geolocation is still loading', () => {
    expect(isCopyTradeAllowedForGeolocation(undefined, 'loading')).toBe(false);
  });

  it('returns false when the lookup has not started', () => {
    expect(isCopyTradeAllowedForGeolocation(undefined, 'idle')).toBe(false);
  });

  it('returns false when the lookup failed', () => {
    expect(isCopyTradeAllowedForGeolocation(undefined, 'error')).toBe(false);
  });

  it('returns false when status is missing', () => {
    expect(isCopyTradeAllowedForGeolocation('FR', undefined)).toBe(false);
  });

  it('returns false for an unknown location', () => {
    expect(isCopyTradeAllowedForGeolocation(UNKNOWN_LOCATION, 'complete')).toBe(
      false,
    );
  });

  it('returns false when the location is empty', () => {
    expect(isCopyTradeAllowedForGeolocation('', 'complete')).toBe(false);
  });
});
