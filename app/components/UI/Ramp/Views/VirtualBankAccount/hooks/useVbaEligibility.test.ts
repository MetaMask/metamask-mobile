import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { getVbaEligibility } from './useVbaEligibility';

const base = {
  isFlagEnabled: true,
  geolocationStatus: 'complete' as const,
  isDevBypassEnabled: false,
};

describe('getVbaEligibility', () => {
  it('is eligible when the flag is on and IP geolocation is Brazil', () => {
    expect(getVbaEligibility({ ...base, location: 'BR-SP' })).toEqual({
      isEligible: true,
      isLoading: false,
      isFlagEnabled: true,
      isRegionEligible: true,
      isDevBypassEnabled: false,
      location: 'BR-SP',
    });
  });

  it('accepts a lowercase Brazil IP location', () => {
    const result = getVbaEligibility({ ...base, location: 'br' });

    expect(result.isEligible).toBe(true);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is not eligible when the flag is off, even in Brazil with the bypass on', () => {
    const result = getVbaEligibility({
      isFlagEnabled: false,
      location: 'BR',
      geolocationStatus: 'complete',
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is not eligible when IP geolocation is outside Brazil', () => {
    const result = getVbaEligibility({ ...base, location: 'ES' });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it('is eligible outside Brazil when the flag is on and the dev bypass is set', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'US-CA',
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(true);
    expect(result.isRegionEligible).toBe(false);
  });

  it('is not eligible and not loading when IP geolocation resolved to unknown', () => {
    const result = getVbaEligibility({
      ...base,
      location: UNKNOWN_LOCATION,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isLoading).toBe(false);
    expect(result.location).toBe(UNKNOWN_LOCATION);
  });

  it.each(['idle', 'loading', undefined] as const)(
    'is loading while IP geolocation is empty and status is %s',
    (geolocationStatus) => {
      const result = getVbaEligibility({
        ...base,
        location: '   ',
        geolocationStatus,
      });

      expect(result.isLoading).toBe(true);
      expect(result.isEligible).toBe(false);
      expect(result.location).toBeUndefined();
    },
  );

  it('is not loading once the IP lookup errored with no location', () => {
    const result = getVbaEligibility({
      ...base,
      location: undefined,
      geolocationStatus: 'error',
    });

    expect(result.isLoading).toBe(false);
    expect(result.isEligible).toBe(false);
  });

  it('uses a resolved IP location even while a refresh is still loading', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'BR',
      geolocationStatus: 'loading',
    });

    expect(result.isLoading).toBe(false);
    expect(result.isEligible).toBe(true);
  });
});
