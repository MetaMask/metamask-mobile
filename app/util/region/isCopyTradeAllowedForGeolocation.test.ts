import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { isCopyTradeAllowedForGeolocation } from './isCopyTradeAllowedForGeolocation';

const UK_ONLY = ['GB'];

describe('isCopyTradeAllowedForGeolocation', () => {
  it('returns true for a completed country outside the blocked list', () => {
    expect(isCopyTradeAllowedForGeolocation('FR', 'complete', UK_ONLY)).toBe(
      true,
    );
  });

  it('returns true for a country-region code outside the blocked list', () => {
    expect(isCopyTradeAllowedForGeolocation('US-CA', 'complete', UK_ONLY)).toBe(
      true,
    );
  });

  it('returns false for a blocked country code', () => {
    expect(isCopyTradeAllowedForGeolocation('GB', 'complete', UK_ONLY)).toBe(
      false,
    );
  });

  it('returns false for a region under a blocked country', () => {
    expect(
      isCopyTradeAllowedForGeolocation('gb-eng', 'complete', UK_ONLY),
    ).toBe(false);
  });

  it('returns false for a country blocked as a whole, including its regions', () => {
    expect(isCopyTradeAllowedForGeolocation('US-CA', 'complete', ['US'])).toBe(
      false,
    );
  });

  it('returns true for another region when only one region is blocked', () => {
    expect(
      isCopyTradeAllowedForGeolocation('CA-BC', 'complete', ['CA-ON']),
    ).toBe(true);
  });

  it('returns false for the blocked region itself', () => {
    expect(
      isCopyTradeAllowedForGeolocation('CA-ON', 'complete', ['CA-ON']),
    ).toBe(false);
  });

  it('matches blocked entries regardless of case', () => {
    expect(isCopyTradeAllowedForGeolocation('US', 'complete', ['us'])).toBe(
      false,
    );
  });

  it('ignores blank blocked entries', () => {
    expect(isCopyTradeAllowedForGeolocation('FR', 'complete', ['', ' '])).toBe(
      true,
    );
  });

  it('returns true for any completed location when nothing is blocked', () => {
    expect(isCopyTradeAllowedForGeolocation('GB', 'complete', [])).toBe(true);
  });

  it('returns false while geolocation is still loading', () => {
    expect(
      isCopyTradeAllowedForGeolocation(undefined, 'loading', UK_ONLY),
    ).toBe(false);
  });

  it('returns false when the lookup has not started', () => {
    expect(isCopyTradeAllowedForGeolocation(undefined, 'idle', UK_ONLY)).toBe(
      false,
    );
  });

  it('returns false when the lookup failed', () => {
    expect(isCopyTradeAllowedForGeolocation(undefined, 'error', UK_ONLY)).toBe(
      false,
    );
  });

  it('returns false when status is missing', () => {
    expect(isCopyTradeAllowedForGeolocation('FR', undefined, UK_ONLY)).toBe(
      false,
    );
  });

  it('returns false for an unknown location', () => {
    expect(
      isCopyTradeAllowedForGeolocation(UNKNOWN_LOCATION, 'complete', UK_ONLY),
    ).toBe(false);
  });

  it('returns false when the location is empty', () => {
    expect(isCopyTradeAllowedForGeolocation('', 'complete', UK_ONLY)).toBe(
      false,
    );
  });
});
