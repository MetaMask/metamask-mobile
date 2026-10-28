import { selectMfaUiKitEnabled, selectMfaUiKitMethods } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

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

describe('selectMfaUiKitEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    jest.mocked(isMfaDevBuild).mockReturnValue(false);
  });

  it.each([true, false])(
    'follows the remote flag when enabled is %s',
    (enabled) => {
      expect(
        selectMfaUiKitEnabled.resultFunc({
          [FeatureFlagNames.mfaUiKit]: { enabled, minimumVersion: '1.0.0' },
        }),
      ).toBe(enabled);
    },
  );

  it('stays hidden below the minimum version', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      selectMfaUiKitEnabled.resultFunc({
        [FeatureFlagNames.mfaUiKit]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(false);
  });

  it.each([
    ['missing', {}],
    ['invalid', { [FeatureFlagNames.mfaUiKit]: { enabled: true } }],
  ])('falls back to the build check when the flag is %s', (_case, flags) => {
    jest.mocked(isMfaDevBuild).mockReturnValue(true);

    expect(selectMfaUiKitEnabled.resultFunc(flags)).toBe(true);
  });
});

describe('selectMfaUiKitMethods', () => {
  it('lists the flag methods', () => {
    expect(
      selectMfaUiKitMethods.resultFunc({
        [FeatureFlagNames.mfaUiKit]: {
          enabled: true,
          minimumVersion: '1.0.0',
          methods: ['email_otp'],
        },
      }),
    ).toStrictEqual(['email_otp']);
  });

  it('reads the methods of a progressive rollout', () => {
    expect(
      selectMfaUiKitMethods.resultFunc({
        [FeatureFlagNames.mfaUiKit]: {
          name: 'rollout',
          value: {
            enabled: true,
            minimumVersion: '1.0.0',
            methods: ['email_otp'],
          },
        },
      }),
    ).toStrictEqual(['email_otp']);
  });

  it('allows every method when the flag lists none', () => {
    expect(selectMfaUiKitMethods.resultFunc({})).toStrictEqual([
      'passkey',
      'totp',
      'email_otp',
    ]);
  });
});
