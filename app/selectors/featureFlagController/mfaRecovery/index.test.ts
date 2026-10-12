import { FeatureFlagNames } from '../../../constants/featureFlags';
import { selectMfaRecoveryEnabled } from './index';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectMfaRecoveryEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('returns true when the remote flag is enabled for the app version', () => {
    expect(
      selectMfaRecoveryEnabled.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });

  it('returns false when the remote flag is disabled or invalid', () => {
    expect(
      selectMfaRecoveryEnabled.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(false);
    expect(
      selectMfaRecoveryEnabled.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: 'yes',
          minimumVersion: 1,
        } as unknown as { enabled: boolean; minimumVersion: string },
      }),
    ).toBe(false);
  });

  it('returns false when the minimum version check fails', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      selectMfaRecoveryEnabled.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(false);
  });

  it('returns false when the flag is absent', () => {
    expect(selectMfaRecoveryEnabled.resultFunc({})).toBe(false);
  });
});
