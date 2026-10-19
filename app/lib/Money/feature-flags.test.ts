// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../util/remoteFeatureFlag';
import { isMoneyAccountEnabled, isMoneyMfaEnabled } from './feature-flags';

jest.mock('../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../util/remoteFeatureFlag'),
  validatedVersionGatedFeatureFlag: jest.fn(),
}));

const mockedValidate =
  remoteFeatureFlagModule.validatedVersionGatedFeatureFlag as jest.MockedFunction<
    typeof remoteFeatureFlagModule.validatedVersionGatedFeatureFlag
  >;

describe('isMoneyAccountEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const result = isMoneyAccountEnabled({
      moneyEnableMoneyAccount: { enabled: true, minimumVersion: '1.0.0' },
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const result = isMoneyAccountEnabled({
      moneyEnableMoneyAccount: { enabled: false, minimumVersion: '1.0.0' },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag returns undefined', () => {
    mockedValidate.mockReturnValue(undefined);

    const result = isMoneyAccountEnabled({});

    expect(result).toBe(false);
  });

  it('returns false when remoteFeatureFlags is undefined', () => {
    mockedValidate.mockReturnValue(undefined);

    const result = isMoneyAccountEnabled(undefined);

    expect(result).toBe(false);
  });
});

describe('isMoneyMfaEnabled', () => {
  const originalEnv = process.env.MM_MONEY_MFA_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MM_MONEY_MFA_ENABLED;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_MONEY_MFA_ENABLED;
    } else {
      process.env.MM_MONEY_MFA_ENABLED = originalEnv;
    }
  });

  it('returns true when remote flag is enabled and version requirement is met', () => {
    mockedValidate.mockReturnValue(true);

    const result = isMoneyMfaEnabled({
      isMoneyMfaEnabled: { enabled: true, minimumVersion: '1.0.0' },
    });

    expect(result).toBe(true);
  });

  it('returns false when remote flag is disabled', () => {
    mockedValidate.mockReturnValue(false);

    const result = isMoneyMfaEnabled({
      isMoneyMfaEnabled: { enabled: false, minimumVersion: '1.0.0' },
    });

    expect(result).toBe(false);
  });

  it('returns false when remote flag is missing and local env is unset', () => {
    mockedValidate.mockReturnValue(undefined);

    const result = isMoneyMfaEnabled({});

    expect(result).toBe(false);
  });

  it('returns true when remote flag is missing and MM_MONEY_MFA_ENABLED is true', () => {
    mockedValidate.mockReturnValue(undefined);
    process.env.MM_MONEY_MFA_ENABLED = 'true';

    const result = isMoneyMfaEnabled({});

    expect(result).toBe(true);
  });

  it('returns false when remoteFeatureFlags is undefined and local env is unset', () => {
    mockedValidate.mockReturnValue(undefined);

    const result = isMoneyMfaEnabled(undefined);

    expect(result).toBe(false);
  });
});
