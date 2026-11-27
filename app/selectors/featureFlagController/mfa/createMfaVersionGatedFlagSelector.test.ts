import { createMfaVersionGatedFlagSelector } from './createMfaVersionGatedFlagSelector';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { isMfaForceDisabled } from '../../../util/identity/mfa/isMfaForceDisabled';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';
import { selectMfaUiKitEnabled } from '../mfaUiKit';
import { selectMfaRecoveryEnabled } from '../mfaRecovery';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

jest.mock('../../../util/identity/mfa/isMfaDevBuild', () => ({
  isMfaDevBuild: jest.fn(),
}));

jest.mock('../../../util/identity/mfa/isMfaForceDisabled', () => ({
  isMfaForceDisabled: jest.fn(),
}));

describe.each([
  ['selectMfaUiKitEnabled', selectMfaUiKitEnabled, FeatureFlagNames.mfaUiKit],
  [
    'selectMfaRecoveryEnabled',
    selectMfaRecoveryEnabled,
    FeatureFlagNames.mfaRecovery,
  ],
] as const)('%s', (_name, selector, flagName) => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    jest.mocked(isMfaDevBuild).mockReturnValue(false);
    jest.mocked(isMfaForceDisabled).mockReturnValue(false);
  });

  it('stays off when the build force-disables MFA, even with the remote flag on', () => {
    jest.mocked(isMfaForceDisabled).mockReturnValue(true);

    expect(
      selector.resultFunc({
        [flagName]: { enabled: true, minimumVersion: '1.0.0' },
      }),
    ).toBe(false);
  });

  it('stays off when the build force-disables MFA on a dev build', () => {
    jest.mocked(isMfaForceDisabled).mockReturnValue(true);
    jest.mocked(isMfaDevBuild).mockReturnValue(true);

    expect(selector.resultFunc({})).toBe(false);
  });

  it.each([true, false])(
    'follows the remote flag when enabled is %s',
    (enabled) => {
      expect(
        selector.resultFunc({
          [flagName]: { enabled, minimumVersion: '1.0.0' },
        }),
      ).toBe(enabled);
    },
  );

  it('stays hidden below the minimum version', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      selector.resultFunc({
        [flagName]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(false);
  });

  it.each([
    ['missing', {}],
    ['invalid', { [flagName]: { enabled: true } }],
  ])('falls back to the build check when the flag is %s', (_case, flags) => {
    jest.mocked(isMfaDevBuild).mockReturnValue(true);

    expect(selector.resultFunc(flags)).toBe(true);
  });

  it('hides the surface on non-dev builds when the flag is missing', () => {
    jest.mocked(isMfaDevBuild).mockReturnValue(false);

    expect(selector.resultFunc({})).toBe(false);
  });
});

describe('createMfaVersionGatedFlagSelector', () => {
  it('builds a selector for the given flag name', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    jest.mocked(isMfaDevBuild).mockReturnValue(false);
    jest.mocked(isMfaForceDisabled).mockReturnValue(false);

    const selector = createMfaVersionGatedFlagSelector(
      FeatureFlagNames.mfaRecovery,
    );

    expect(
      selector.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });
});
