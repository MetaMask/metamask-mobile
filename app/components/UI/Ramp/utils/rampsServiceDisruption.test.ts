import type { UserRegion } from '@metamask/ramps-controller';
import { isRampsServiceDisruptionActive } from './rampsServiceDisruption';

const region = (regionCode: string) =>
  ({
    regionCode,
    country: { isoCode: regionCode.split('-')[0].toUpperCase() },
    state: null,
  }) as unknown as UserRegion;

describe('isRampsServiceDisruptionActive', () => {
  it('returns false when the service disruption list is empty', () => {
    expect(isRampsServiceDisruptionActive([], region('in'))).toBe(false);
  });

  it('matches a country-level region exactly', () => {
    expect(isRampsServiceDisruptionActive(['in'], region('in'))).toBe(true);
  });

  it('matches all states under a country entry (hierarchical)', () => {
    expect(isRampsServiceDisruptionActive(['us'], region('us-ca'))).toBe(true);
  });

  it('matches a specific state entry only', () => {
    expect(isRampsServiceDisruptionActive(['us-ca'], region('us-ca'))).toBe(
      true,
    );
    expect(isRampsServiceDisruptionActive(['us-ca'], region('us-ny'))).toBe(
      false,
    );
  });

  it('does not match an unrelated region', () => {
    expect(isRampsServiceDisruptionActive(['fr'], region('us-ca'))).toBe(false);
  });

  it('is case-insensitive on both sides', () => {
    expect(isRampsServiceDisruptionActive(['IN'], region('in'))).toBe(true);
  });

  it('falls back to geolocation when region is unresolved', () => {
    expect(isRampsServiceDisruptionActive(['in'], null, 'IN')).toBe(true);
    expect(isRampsServiceDisruptionActive(['us-ca'], null, 'US-CA')).toBe(true);
  });

  it('does not block when nothing resolves (region null, geo UNKNOWN)', () => {
    expect(isRampsServiceDisruptionActive(['in'], null, 'UNKNOWN')).toBe(false);
    expect(isRampsServiceDisruptionActive(['in'], null, undefined)).toBe(false);
  });
});
