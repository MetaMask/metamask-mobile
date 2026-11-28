import { createMfaVersionGatedFlagSelector } from './createMfaVersionGatedFlagSelector';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
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
});

describe('selectMfaUiKitEnabled fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it.each([
    ['missing', {}],
    ['invalid', { [FeatureFlagNames.mfaUiKit]: { enabled: true } }],
  ])('falls back to the build check when the flag is %s', (_case, flags) => {
    jest.mocked(isMfaDevBuild).mockReturnValue(true);

    expect(selectMfaUiKitEnabled.resultFunc(flags)).toBe(true);
  });

  it('hides the surface on non-dev builds when the flag is missing', () => {
    jest.mocked(isMfaDevBuild).mockReturnValue(false);

    expect(selectMfaUiKitEnabled.resultFunc({})).toBe(false);
  });
});

describe('selectMfaRecoveryEnabled fallback', () => {
  const originalFlag = process.env.MM_MONEY_MFA_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    // rc, exp, dev, e2e, and test are dev builds. That must not turn recovery on.
    jest.mocked(isMfaDevBuild).mockReturnValue(true);
    delete process.env.MM_MONEY_MFA_ENABLED;
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.MM_MONEY_MFA_ENABLED;
    } else {
      process.env.MM_MONEY_MFA_ENABLED = originalFlag;
    }
  });

  it.each([
    ['missing', {}],
    ['invalid', { [FeatureFlagNames.mfaRecovery]: { enabled: true } }],
  ])(
    'stays off when the flag is %s and the local switch is unset',
    (_case, flags) => {
      expect(selectMfaRecoveryEnabled.resultFunc(flags)).toBe(false);
    },
  );

  it('turns on from MM_MONEY_MFA_ENABLED when the remote flag is missing', () => {
    process.env.MM_MONEY_MFA_ENABLED = 'true';

    expect(selectMfaRecoveryEnabled.resultFunc({})).toBe(true);
  });

  it('keeps the remote disabled value when MM_MONEY_MFA_ENABLED is true', () => {
    process.env.MM_MONEY_MFA_ENABLED = 'true';

    expect(
      selectMfaRecoveryEnabled.resultFunc({
        [FeatureFlagNames.mfaRecovery]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(false);
  });
});

describe('createMfaVersionGatedFlagSelector', () => {
  it('builds a selector for the given flag name', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
    jest.mocked(isMfaDevBuild).mockReturnValue(false);

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
