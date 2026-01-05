import {
  selectFullPageAccountListEnabledRawFlag,
  selectFullPageAccountListEnabledFlag,
  FULL_PAGE_ACCOUNT_LIST_FLAG_NAME,
} from '.';
// eslint-disable-next-line import/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

describe('Full Page Account List Feature Flag Selectors', () => {
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

  describe('selectFullPageAccountListEnabledRawFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote feature flags are empty', () => {
      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectFullPageAccountListEnabledRawFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });

  describe('selectFullPageAccountListEnabledFlag', () => {
    it('returns true when basic functionality is enabled and raw flag is true', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc(
        true,
        true,
      );

      expect(result).toBe(true);
    });

    it('returns false when basic functionality is enabled and raw flag is false', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc(
        true,
        false,
      );

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled even if raw flag is true', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc(
        false,
        true,
      );

      expect(result).toBe(false);
    });

    it('returns false when basic functionality is disabled and raw flag is false', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc(
        false,
        false,
      );

      expect(result).toBe(false);
    });
  });
});
