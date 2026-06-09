// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../util/remoteFeatureFlag';
import { isMoneyAccountEnabled } from './feature-flags';

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
