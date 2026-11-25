import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import type { Json } from '@metamask/utils';
import { getVersion } from 'react-native-device-info';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import {
  MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY,
  MONEY_MOVEMENT_NEOBANK_FLAG_KEY,
} from '../../../../../../selectors/featureFlagController/moneyAccount';
import type { VbaMarket } from '../../../../../../util/region/getVbaSourceCurrency';
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

const brl = { currency: 'BRL', regions: ['BR'] } as const;
const usd = { currency: 'USD', regions: ['US'] } as const;
const brlOnlyMarkets = [brl];
const brAndUsMarkets = [brl, usd];
const emptyMarkets: VbaMarket[] = [];

const base = {
  isFlagEnabled: true,
  geolocationStatus: 'complete' as const,
  isDevBypassEnabled: false,
  markets: brlOnlyMarkets,
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
      market: brl,
    });
  });

  it('exposes the market that serves the effective location', () => {
    const eur = { currency: 'EUR', regions: ['DE'] } as const;

    const result = getVbaEligibility({
      ...base,
      location: 'DE-BE',
      markets: [eur],
    });

    expect(result.market).toEqual(eur);
  });

  it('has no market when the location is outside every open region', () => {
    const result = getVbaEligibility({ ...base, location: 'ES' });

    expect(result.market).toBeUndefined();
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
      markets: brlOnlyMarkets,
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

  it('is eligible in the US when the USD market lists the US', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'US-NY',
      markets: brAndUsMarkets,
    });

    expect(result.isEligible).toBe(true);
    expect(result.isRegionEligible).toBe(true);
  });

  it('is disabled in Brazil when no market lists any country', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'BR',
      markets: emptyMarkets,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isRegionEligible).toBe(false);
  });

  it('is not eligible via the dev bypass when no currency flag is open', () => {
    const result = getVbaEligibility({
      isFlagEnabled: false,
      location: 'US',
      geolocationStatus: 'complete',
      markets: emptyMarkets,
      isDevBypassEnabled: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.isFlagEnabled).toBe(false);
    expect(result.isRegionEligible).toBe(false);
  });

  it('is not eligible in Brazil when only the US market is open', () => {
    const result = getVbaEligibility({
      ...base,
      location: 'BR',
      markets: [usd],
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
  const globalFlag = {
    enabled: false,
    minimumVersion: '0.0.0',
  };
  const enabledBrlFlag = {
    enabled: true,
    minimumVersion: '0.0.0',
    currency: 'BRL',
    regions: ['BR'],
  };

  beforeEach(() => {
    jest.mocked(getVersion).mockReturnValue('99.0.0');
  });

  const renderEligibility = ({
    regionOverride,
    location,
    brlFlag = enabledBrlFlag,
    neobankFlag = globalFlag,
  }: {
    regionOverride?: Json;
    location: string;
    brlFlag?: Json;
    neobankFlag?: Record<string, Json>;
  }) =>
    renderHookWithProvider(() => useVbaEligibility(), {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [MONEY_MOVEMENT_NEOBANK_FLAG_KEY]: {
                  ...neobankFlag,
                  ...(regionOverride !== undefined ? { regionOverride } : {}),
                },
                ...(brlFlag !== undefined
                  ? { [MONEY_MOVEMENT_NEOBANK_BRL_FLAG_KEY]: brlFlag }
                  : {}),
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
    const { result } = renderEligibility({
      regionOverride: ' br ',
      location: 'DE',
    });

    expect(result.current.isEligible).toBe(true);
    expect(result.current.isFlagEnabled).toBe(true);
    expect(result.current.isRegionEligible).toBe(true);
    expect(result.current.location).toBe('BR');
  });

  it('is not eligible when the override country is outside every market', () => {
    const { result } = renderEligibility({
      regionOverride: 'DE',
      location: 'BR',
    });

    expect(result.current.isEligible).toBe(false);
    expect(result.current.isFlagEnabled).toBe(true);
    expect(result.current.isRegionEligible).toBe(false);
    expect(result.current.location).toBe('DE');
  });

  it('reads regionOverride even when moneyMovementNeobank.enabled is false', () => {
    const { result } = renderEligibility({
      regionOverride: 'BR',
      location: 'DE',
      neobankFlag: { ...globalFlag, enabled: false },
    });

    expect(result.current.isEligible).toBe(true);
    expect(result.current.location).toBe('BR');
  });

  it('is eligible in Brazil when only the BRL currency flag is open', () => {
    const { result } = renderEligibility({ location: 'BR' });

    expect(result.current.isEligible).toBe(true);
    expect(result.current.isFlagEnabled).toBe(true);
  });

  it('is not eligible when no currency flag is open', () => {
    const { result } = renderEligibility({
      location: 'BR',
      brlFlag: {
        enabled: false,
        minimumVersion: '0.0.0',
        currency: 'BRL',
        regions: ['BR'],
      },
    });

    expect(result.current.isEligible).toBe(false);
    expect(result.current.isFlagEnabled).toBe(false);
  });
});
