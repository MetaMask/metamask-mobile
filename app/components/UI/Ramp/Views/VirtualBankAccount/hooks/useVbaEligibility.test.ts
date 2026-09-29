import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import type { UserRegion } from '@metamask/ramps-controller';
import type { RootState } from '../../../../../../reducers';
import {
  getVbaEligibility,
  selectVbaRegion,
  type VbaRegion,
} from './useVbaEligibility';

const brazilUserRegion: UserRegion = {
  country: {
    isoCode: 'BR',
    name: 'Brazil',
    flag: '🇧🇷',
    phone: { prefix: '+55', placeholder: '', template: '' },
    currency: 'BRL',
    supported: { buy: true, sell: true },
  },
  state: null,
  regionCode: 'br',
};

const createState = (
  userRegion: UserRegion | null,
  geolocation: string | undefined,
) =>
  ({
    engine: {
      backgroundState: {
        RampsController: { userRegion },
        GeolocationController: { location: geolocation },
      },
    },
  }) as unknown as RootState;

describe('selectVbaRegion', () => {
  it('prefers the Ramps (Settings) region over IP geolocation', () => {
    expect(selectVbaRegion(createState(brazilUserRegion, 'ES'))).toEqual({
      regionCode: 'br',
      source: 'ramps',
    });
  });

  it('falls back to IP geolocation when no Ramps region is set', () => {
    expect(selectVbaRegion(createState(null, 'ES-MD'))).toEqual({
      regionCode: 'ES-MD',
      source: 'geolocation',
    });
  });

  it('returns none when neither source has a region', () => {
    expect(selectVbaRegion(createState(null, undefined))).toEqual({
      regionCode: undefined,
      source: 'none',
    });
  });

  it('ignores a blank Ramps region code', () => {
    expect(
      selectVbaRegion(
        createState({ ...brazilUserRegion, regionCode: '  ' }, 'BR'),
      ),
    ).toEqual({ regionCode: 'BR', source: 'geolocation' });
  });
});

describe('getVbaEligibility', () => {
  const brazil: VbaRegion = { regionCode: 'br-sp', source: 'ramps' };
  const spain: VbaRegion = { regionCode: 'ES', source: 'geolocation' };
  const unknown: VbaRegion = {
    regionCode: UNKNOWN_LOCATION,
    source: 'geolocation',
  };
  const none: VbaRegion = { regionCode: undefined, source: 'none' };

  it('is eligible when the flag is on and the region is Brazil', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: brazil,
      geolocationStatus: 'complete',
      isDevBypassEnabled: false,
    });

    expect(result).toEqual({
      isEligible: true,
      isLoading: false,
      isFlagEnabled: true,
      isRegionEligible: true,
      isDevBypassEnabled: false,
      regionCode: 'br-sp',
      regionSource: 'ramps',
    });
  });

  it('is not eligible when the flag is off, even in Brazil with the bypass on', () => {
    const result = getVbaEligibility({
      isFlagEnabled: false,
      region: brazil,
      geolocationStatus: 'complete',
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is not eligible outside Brazil when the flag is on', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: spain,
      geolocationStatus: 'complete',
      isDevBypassEnabled: false,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it('is eligible outside Brazil when the flag is on and the dev bypass is set', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: spain,
      geolocationStatus: 'complete',
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(true);
    expect(result.isRegionEligible).toBe(false);
  });

  it('is not eligible and not loading when geolocation resolved to unknown', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: unknown,
      geolocationStatus: 'complete',
      isDevBypassEnabled: false,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isLoading).toBe(false);
  });

  it.each(['idle', 'loading', undefined] as const)(
    'is loading while no region is resolved and the IP lookup status is %s',
    (geolocationStatus) => {
      const result = getVbaEligibility({
        isFlagEnabled: true,
        region: none,
        geolocationStatus,
        isDevBypassEnabled: false,
      });

      expect(result.isLoading).toBe(true);
      expect(result.isEligible).toBe(false);
    },
  );

  it('is not loading once the IP lookup errored with no region', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: none,
      geolocationStatus: 'error',
      isDevBypassEnabled: false,
    });

    expect(result.isLoading).toBe(false);
    expect(result.isEligible).toBe(false);
  });

  it('is not loading when a Settings region exists even if the IP lookup is idle', () => {
    const result = getVbaEligibility({
      isFlagEnabled: true,
      region: brazil,
      geolocationStatus: 'idle',
      isDevBypassEnabled: false,
    });

    expect(result.isLoading).toBe(false);
    expect(result.isEligible).toBe(true);
  });
});
