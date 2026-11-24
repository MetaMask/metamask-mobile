import { selectMfaRecoveryEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevRecoveryBuild } from '../../../core/MfaRecovery/isMfaDevRecoveryBuild';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

jest.mock('../../../core/MfaRecovery/isMfaDevRecoveryBuild', () => ({
  isMfaDevRecoveryBuild: jest.fn(),
}));

describe('selectMfaRecoveryEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    jest.mocked(isMfaDevRecoveryBuild).mockReturnValue(false);
  });

  it.each([true, false])(
    'follows the remote flag when enabled is %s',
    (enabled) => {
      expect(
        selectMfaRecoveryEnabled.resultFunc({
          [FeatureFlagNames.mfaRecovery]: {
            enabled,
            minimumVersion: '1.0.0',
          },
        }),
      ).toBe(enabled);
    },
  );

  it('stays hidden below the minimum version', () => {
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

  it.each([
    ['missing', {}],
    ['invalid', { [FeatureFlagNames.mfaRecovery]: { enabled: true } }],
  ])('falls back to the build check when the flag is %s', (_case, flags) => {
    jest.mocked(isMfaDevRecoveryBuild).mockReturnValue(true);

    expect(selectMfaRecoveryEnabled.resultFunc(flags)).toBe(true);
  });

  it('hides recovery on non-dev builds when the flag is missing', () => {
    jest.mocked(isMfaDevRecoveryBuild).mockReturnValue(false);

    expect(selectMfaRecoveryEnabled.resultFunc({})).toBe(false);
  });
});
