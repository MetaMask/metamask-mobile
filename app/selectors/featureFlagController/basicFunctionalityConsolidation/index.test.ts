import {
  MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME,
  selectIsBasicFunctionalityConsolidationEnabled,
  selectMobileUxBftcConsolidationFlagEnabled,
} from './index';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.60.0'),
}));

describe('basicFunctionalityConsolidation selectors', () => {
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

  describe('selectMobileUxBftcConsolidationFlagEnabled', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc({
        [MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when remote flag is disabled', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc({
        [MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when remote flag is missing', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc({});

      expect(result).toBe(false);
    });
  });

  describe('selectIsBasicFunctionalityConsolidationEnabled', () => {
    it('returns true when remote flag and cohort marker are enabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        true,
      );

      expect(result).toBe(true);
    });

    it('returns false when remote flag is disabled (kill-switch)', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        false,
        true,
      );

      expect(result).toBe(false);
    });

    it('returns false when cohort marker is missing for existing users', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        false,
      );

      expect(result).toBe(false);
    });
  });
});
