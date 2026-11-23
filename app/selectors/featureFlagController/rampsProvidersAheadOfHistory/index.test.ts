import { selectRampsProvidersAheadOfHistory } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

const select = (flag?: unknown) =>
  selectRampsProvidersAheadOfHistory.resultFunc(
    flag === undefined
      ? {}
      : { [FeatureFlagNames.rampsProvidersAheadOfHistory]: flag as never },
  );

describe('selectRampsProvidersAheadOfHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns the provider ids when the flag is enabled', () => {
    expect(
      select({
        enabled: true,
        minimumVersion: '1.0.0',
        providerIds: ['crossmint'],
      }),
    ).toStrictEqual(['crossmint']);
  });

  it('returns the provider ids from a progressive rollout wrapper', () => {
    expect(
      select({
        name: 'rollout',
        value: {
          enabled: true,
          minimumVersion: '1.0.0',
          providerIds: ['crossmint'],
        },
      }),
    ).toStrictEqual(['crossmint']);
  });

  it('returns an empty list when the flag is disabled', () => {
    expect(
      select({
        enabled: false,
        minimumVersion: '1.0.0',
        providerIds: ['crossmint'],
      }),
    ).toStrictEqual([]);
  });

  it('returns an empty list when the version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      select({
        enabled: true,
        minimumVersion: '99.0.0',
        providerIds: ['crossmint'],
      }),
    ).toStrictEqual([]);
  });

  it('returns an empty list when the flag is absent', () => {
    expect(select()).toStrictEqual([]);
  });

  it.each([
    ['a boolean', true],
    ['missing providerIds', { enabled: true, minimumVersion: '1.0.0' }],
    [
      'non-string providerIds',
      { enabled: true, minimumVersion: '1.0.0', providerIds: [1] },
    ],
    [
      'an empty provider id',
      { enabled: true, minimumVersion: '1.0.0', providerIds: [''] },
    ],
  ])('returns an empty list for %s', (_label, flag) => {
    expect(select(flag)).toStrictEqual([]);
  });
});
