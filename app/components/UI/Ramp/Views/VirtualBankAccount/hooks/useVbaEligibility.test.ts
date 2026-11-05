import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import type { Json } from '@metamask/utils';
import { getVersion } from 'react-native-device-info';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { MONEY_MOVEMENT_NEOBANK_FLAG_KEY } from '../../../../../../selectors/featureFlagController/moneyAccount';
import { getVbaEligibility, useVbaEligibility } from './useVbaEligibility';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('99.0.0'),
}));

jest.mock(
  '../../../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

const base = {
  isFlagEnabled: true,
  geolocationStatus: 'complete' as const,
  isDevBypassEnabled: false,
  regions: ['BR'],
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
      regions: ['BR'],
    });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is not eligible when IP geolocation is outside the allowed regions', () => {
    const result = getVbaEligibility({ ...base, location: 'ES' });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it('is eligible in the US when US is in the region list', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'US-NY',
      regions: ['BR', 'US'],
    });

    expect(result.isEligible).toBe(true);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is disabled in Brazil when the region list is empty', () => {
    const result = getVbaEligibility({ ...base, location: 'BR', regions: [] });

    expect(result.isEligible).toBe(false);
    expect(result.isFlagEnabled).toBe(false);
    expect(result.isRegionEligible).toBe(false);
  });

  it('stays disabled when the region list is empty even with the dev bypass', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'US',
      regions: [],
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isFlagEnabled).toBe(false);
  });

  it('is not eligible in Brazil when only US is listed', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'BR',
      regions: ['US'],
    });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(false);
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

describe('useVbaEligibility regionOverride', () => {
  const enabledFlag = {
    enabled: true,
    minimumVersion: '0.0.0',
    regions: ['BR'],
    regionCurrencies: { BR: 'BRL' },
  };

  beforeEach(() => {
    jest.mocked(getVersion).mockReturnValue('99.0.0');
  });

  const renderEligibility = (
    regionOverride: Json,
    location: string,
    flag: Record<string, Json> = enabledFlag,
  ) =>
    renderHookWithProvider(() => useVbaEligibility(), {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
                  ...flag,
                  regionOverride,
                },
              },
            },
            GeolocationController: {
              location,
              status: 'complete',
            },
          },
        },
      },
    });

  it('uses the flag regionOverride ahead of the IP location', () => {
    const { result } = renderEligibility(' br ', 'DE');

    expect(result.current.isEligible).toBe(true);
    expect(result.current.isRegionEligible).toBe(true);
    expect(result.current.location).toBe('BR');
  });

  it('is not eligible when the override country is outside regions', () => {
    const { result } = renderEligibility('DE', 'BR');

    expect(result.current.isEligible).toBe(false);
    expect(result.current.isRegionEligible).toBe(false);
    expect(result.current.location).toBe('DE');
  });

  it('uses the IP location when a disabled flag still sends regionOverride', () => {
    const { result } = renderEligibility('BR', 'DE', {
      ...enabledFlag,
      enabled: false,
    });

    expect(result.current.isEligible).toBe(false);
    expect(result.current.location).toBe('DE');
  });
});
