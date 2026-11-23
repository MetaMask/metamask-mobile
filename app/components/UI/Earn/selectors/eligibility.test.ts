import {
  selectIsEarnSectionEligible,
  selectIsMusdConversionGeoEligible,
} from './eligibility';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from './featureFlags';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { selectTrxStakingEnabled } from '../../../../selectors/featureFlagController/trxStakingEnabled';
import { pooledStakingSelectors } from '../../../../selectors/earnController/pooledStaking';
import type { RootState } from '../../../../reducers';

jest.mock('./featureFlags', () => {
  const actual =
    jest.requireActual<typeof import('./featureFlags')>('./featureFlags');

  return {
    ...actual,
    selectPooledStakingEnabledFlag: jest.fn(),
    selectStablecoinLendingEnabledFlag: jest.fn(),
  };
});
jest.mock('../../Money/selectors/visibility', () => ({
  selectIsMoneyAccountVisible: jest.fn(),
}));
jest.mock(
  '../../../../selectors/featureFlagController/trxStakingEnabled',
  () => ({
    selectTrxStakingEnabled: jest.fn(),
  }),
);
jest.mock('../../../../selectors/earnController/pooledStaking', () => ({
  pooledStakingSelectors: {
    selectEligibility: jest.fn(),
  },
}));

const mockSelectIsMoneyAccountVisible = jest.mocked(
  selectIsMoneyAccountVisible,
);
const mockSelectTrxStakingEnabled = jest.mocked(selectTrxStakingEnabled);
const mockSelectPooledStakingEligibility = jest.mocked(
  pooledStakingSelectors.selectEligibility,
);
const mockSelectPooledStakingEnabledFlag = jest.mocked(
  selectPooledStakingEnabledFlag,
);
const mockSelectStablecoinLendingEnabledFlag = jest.mocked(
  selectStablecoinLendingEnabledFlag,
);

describe('selectIsMusdConversionGeoEligible', () => {
  const createStateWithGeolocation = (
    geolocation: string | null | undefined,
    remoteFeatureFlags: Record<string, unknown> = {},
  ) =>
    ({
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags,
            cacheTimestamp: 0,
          },
          GeolocationController: {
            location: geolocation,
          },
        },
      },
    }) as unknown as RootState;

  const noBlockedCountriesFlags = {
    earnMusdConversionGeoBlockedCountries: { blockedRegions: [] },
  };

  const gbBlockedFlags = {
    earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB'] },
  };

  const gbUsBlockedFlags = {
    earnMusdConversionGeoBlockedCountries: { blockedRegions: ['GB', 'US'] },
  };

  it('returns false when geolocation is undefined (loading state)', () => {
    const state = createStateWithGeolocation(undefined, gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when geolocation is null', () => {
    const state = createStateWithGeolocation(null, gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when geolocation is UNKNOWN', () => {
    const state = createStateWithGeolocation('UNKNOWN', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when user country is in the blocked list', () => {
    const state = createStateWithGeolocation('GB', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when country-region code matches a blocked country', () => {
    const state = createStateWithGeolocation('GB-ENG', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns false when user is in one of multiple blocked countries', () => {
    const state = createStateWithGeolocation('US', gbUsBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns true when user country is not in the blocked list', () => {
    const state = createStateWithGeolocation('US', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(true);
  });

  it('returns true when the blocked countries list is empty', () => {
    const state = createStateWithGeolocation('GB', noBlockedCountriesFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(true);
  });

  it('comparison is case-insensitive for geolocation codes', () => {
    const state = createStateWithGeolocation('gb', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('comparison is case-insensitive for blocked country codes', () => {
    const lowercaseBlockedFlags = {
      earnMusdConversionGeoBlockedCountries: { blockedRegions: ['gb'] },
    };
    const state = createStateWithGeolocation('GB', lowercaseBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(false);
  });

  it('returns true when user country-region does not match any blocked country', () => {
    const state = createStateWithGeolocation('US-CA', gbBlockedFlags);

    const result = selectIsMusdConversionGeoEligible(state);

    expect(result).toBe(true);
  });
});

describe('selectIsEarnSectionEligible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when Money account is visible', () => {
    mockSelectIsMoneyAccountVisible.mockReturnValue(true);
    mockSelectPooledStakingEligibility.mockReturnValue(false);
    mockSelectPooledStakingEnabledFlag.mockReturnValue(false);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(false);
    mockSelectTrxStakingEnabled.mockReturnValue(false);

    expect(selectIsEarnSectionEligible({} as RootState)).toBe(true);
  });

  it('returns true when an eligible Earn experience is enabled', () => {
    mockSelectIsMoneyAccountVisible.mockReturnValue(false);
    mockSelectPooledStakingEligibility.mockReturnValue(true);
    mockSelectPooledStakingEnabledFlag.mockReturnValue(false);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(true);
    mockSelectTrxStakingEnabled.mockReturnValue(false);

    expect(selectIsEarnSectionEligible({} as RootState)).toBe(true);
  });

  it('returns false when no eligible Earn experience is enabled', () => {
    mockSelectIsMoneyAccountVisible.mockReturnValue(false);
    mockSelectPooledStakingEligibility.mockReturnValue(true);
    mockSelectPooledStakingEnabledFlag.mockReturnValue(false);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(false);
    mockSelectTrxStakingEnabled.mockReturnValue(false);

    expect(selectIsEarnSectionEligible({} as RootState)).toBe(false);
  });

  it('returns false when Earn eligibility is false', () => {
    mockSelectIsMoneyAccountVisible.mockReturnValue(false);
    mockSelectPooledStakingEligibility.mockReturnValue(false);
    mockSelectPooledStakingEnabledFlag.mockReturnValue(true);
    mockSelectStablecoinLendingEnabledFlag.mockReturnValue(true);
    mockSelectTrxStakingEnabled.mockReturnValue(true);

    expect(selectIsEarnSectionEligible({} as RootState)).toBe(false);
  });
});
