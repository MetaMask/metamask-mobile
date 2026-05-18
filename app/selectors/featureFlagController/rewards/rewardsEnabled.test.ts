import {
  selectMissingEnrolledAccountsRewardsEnabledRawFlag,
  selectMissingEnrolledAccountsRewardsEnabledFlag,
  MISSING_ENROLLED_ACCOUNTS_FLAG_NAME,
} from './rewardsEnabled';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Rewards Enabled Feature Flag Selectors', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  describe('selectMissingEnrolledAccountsRewardsEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({
          [MISSING_ENROLLED_ACCOUNTS_FLAG_NAME]: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({
          [MISSING_ENROLLED_ACCOUNTS_FLAG_NAME]: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({
          [MISSING_ENROLLED_ACCOUNTS_FLAG_NAME]: {
            enabled: true,
            minimumVersion: '99.0.0',
          },
        });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({
          [MISSING_ENROLLED_ACCOUNTS_FLAG_NAME]: {
            enabled: 'invalid',
            minimumVersion: 123,
          },
        });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result =
        selectMissingEnrolledAccountsRewardsEnabledRawFlag.resultFunc({
          someOtherFlag: true,
        });

      expect(result).toBe(false);
    });
  });

  describe('selectMissingEnrolledAccountsRewardsEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectMissingEnrolledAccountsRewardsEnabledFlag.resultFunc(
        true,
        true,
      );

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectMissingEnrolledAccountsRewardsEnabledFlag.resultFunc(
        true,
        false,
      );

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectMissingEnrolledAccountsRewardsEnabledFlag.resultFunc(
        false,
        true,
      );

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectMissingEnrolledAccountsRewardsEnabledFlag.resultFunc(
        false,
        false,
      );

      expect(result).toBe(false);
    });
  });
});
