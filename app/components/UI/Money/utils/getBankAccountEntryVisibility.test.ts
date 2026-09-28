import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { getBankAccountEntryVisibility } from './getBankAccountEntryVisibility';

describe('getBankAccountEntryVisibility', () => {
  it('keeps the coming-soon row when the flag is off, even in Brazil', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: false,
        location: 'BR',
        geoBypassEnabled: false,
      }),
    ).toBe('coming-soon');
  });

  it('keeps the coming-soon row when the flag is off and the bypass is on', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: false,
        location: 'US',
        geoBypassEnabled: true,
      }),
    ).toBe('coming-soon');
  });

  it('enables the row when the flag is on and geolocation is Brazil', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: 'BR-SP',
        geoBypassEnabled: false,
      }),
    ).toBe('enabled');
  });

  it('enables the row when the flag is on and the bypass is on outside Brazil', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: 'US',
        geoBypassEnabled: true,
      }),
    ).toBe('enabled');
  });

  it('enables the row when the flag is on, geolocation failed, and the bypass is on', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: UNKNOWN_LOCATION,
        geoBypassEnabled: true,
      }),
    ).toBe('enabled');
  });

  it('hides the row when the flag is on and the country is not Brazil', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: 'US',
        geoBypassEnabled: false,
      }),
    ).toBe('hidden');
  });

  it('hides the row when the flag is on and geolocation is unknown', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: UNKNOWN_LOCATION,
        geoBypassEnabled: false,
      }),
    ).toBe('hidden');
  });

  it('hides the row when the flag is on and geolocation is missing', () => {
    expect(
      getBankAccountEntryVisibility({
        flagEnabled: true,
        location: undefined,
        geoBypassEnabled: false,
      }),
    ).toBe('hidden');
  });
});
