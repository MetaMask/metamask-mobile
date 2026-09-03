import {
  selectFullPageAccountListEnabledFlag,
  FULL_PAGE_ACCOUNT_LIST_FLAG_NAME,
} from './index';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.60.0'),
}));

describe('fullPageAccountList selectors', () => {
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

  describe('selectFullPageAccountListEnabledFlag', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is valid but disabled', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when version check fails', () => {
      mockHasMinimumRequiredVersion.mockReturnValue(false);

      const result = selectFullPageAccountListEnabledFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is invalid', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc({
        [FULL_PAGE_ACCOUNT_LIST_FLAG_NAME]: {
          enabled: 'invalid',
          minimumVersion: 123,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remoteFeatureFlags is empty', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when flag property is missing', () => {
      const result = selectFullPageAccountListEnabledFlag.resultFunc({
        someOtherFlag: true,
      });

      expect(result).toBe(false);
    });
  });
});
