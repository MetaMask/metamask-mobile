import {
  BFT_CHILD_PREFERENCES,
  MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME,
  selectIsBasicFunctionalityConsistent,
  selectIsBasicFunctionalityConsolidationEnabled,
  selectIsSocialLoginBasicFunctionalityLocked,
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldShowBasicFunctionalityMigrationBottomSheet,
  selectShouldShowBasicFunctionalityMigrationToast,
} from './index';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';
import { AccountType } from '../../../constants/onboarding';
import { isBftcConsolidationBuildEnabled } from '../../../constants/featureFlags';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '7.60.0'),
}));

jest.mock('../../../constants/featureFlags', () => ({
  ...jest.requireActual('../../../constants/featureFlags'),
  isBftcConsolidationBuildEnabled: jest.fn(() => false),
}));

describe('basicFunctionalityConsolidation selectors', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    // Clears call counts, keeps implementations
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    // Restores all spies to their original implementations
    jest.restoreAllMocks();
  });

  describe('selectMobileUxBftcConsolidationFlagEnabled', () => {
    it('returns true when remote flag is valid and enabled', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {
          [MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME]: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        },
        true,
        false,
      );

      expect(result).toBe(true);
    });

    it('returns false when remote flag is disabled', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {
          [MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME]: {
            enabled: false,
            minimumVersion: '1.0.0',
          },
        },
        true,
        false,
      );

      expect(result).toBe(false);
    });

    it('returns false when remote flag is missing', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
        false,
      );

      expect(result).toBe(false);
    });

    it('falls back to the build flag when Basic Functionality is off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(true);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        false,
        false,
      );

      expect(result).toBe(true);
    });

    it('returns false when Basic Functionality and the build flag are both off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(false);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        false,
        false,
      );

      expect(result).toBe(false);
    });

    it('keeps the build-flag cohort after migration lands Basic Functionality on', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(true);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
        true,
      );

      expect(result).toBe(true);
    });

    it('does not enroll an on wallet from the build flag alone', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(true);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
        false,
      );

      expect(result).toBe(false);
    });

    it('returns false for a persisted on wallet when the build flag is off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(false);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
        true,
      );

      expect(result).toBe(false);
    });
  });

  describe('selectIsBasicFunctionalityConsistent', () => {
    type BftChildPreferenceValues = Record<
      (typeof BFT_CHILD_PREFERENCES)[number],
      boolean
    >;

    const allOnChildren = Object.fromEntries(
      BFT_CHILD_PREFERENCES.map((preference) => [preference, true]),
    ) as BftChildPreferenceValues;
    const allOffChildren = Object.fromEntries(
      BFT_CHILD_PREFERENCES.map((preference) => [preference, false]),
    ) as BftChildPreferenceValues;

    it('returns true for an all-on legacy BFT configuration', () => {
      expect(
        selectIsBasicFunctionalityConsistent.resultFunc(true, allOnChildren),
      ).toBe(true);
    });

    it('returns true for an all-off legacy BFT configuration', () => {
      expect(
        selectIsBasicFunctionalityConsistent.resultFunc(false, allOffChildren),
      ).toBe(true);
    });

    it('returns false for a mixed legacy BFT configuration', () => {
      const mixedChildren: BftChildPreferenceValues = {
        ...allOnChildren,
        useTokenDetection: false,
      };

      expect(
        selectIsBasicFunctionalityConsistent.resultFunc(true, mixedChildren),
      ).toBe(false);
    });

    it('returns false when PreferencesController child prefs are unavailable', () => {
      expect(selectIsBasicFunctionalityConsistent.resultFunc(true, null)).toBe(
        false,
      );
    });
  });

  describe('selectIsBasicFunctionalityConsolidationEnabled', () => {
    it('returns true when remote flag and cohort marker are enabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        true,
        false,
      );

      expect(result).toBe(true);
    });

    it('returns true for an all-on legacy BFT user when the remote flag is enabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        false,
        true,
      );

      expect(result).toBe(true);
    });

    it('returns true for an all-off legacy BFT user when the remote flag is enabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        false,
        true,
      );

      expect(result).toBe(true);
    });

    it('returns false for a mixed legacy BFT user', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        true,
        false,
        false,
      );

      expect(result).toBe(false);
    });

    it('returns false for a consistent legacy BFT user when the remote flag is disabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        false,
        false,
        true,
      );

      expect(result).toBe(false);
    });

    it('returns false when remote flag is disabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        false,
        true,
        true,
      );

      expect(result).toBe(false);
    });
  });

  describe('migration notification selectors', () => {
    it('shows only the scheduled bottom sheet', () => {
      expect(
        selectShouldShowBasicFunctionalityMigrationBottomSheet.resultFunc(
          'bottom-sheet',
          false,
        ),
      ).toBe(true);
      expect(
        selectShouldShowBasicFunctionalityMigrationToast.resultFunc(
          'bottom-sheet',
          false,
        ),
      ).toBe(false);
    });

    it('shows a pending toast after a feature-flag rollback', () => {
      expect(
        selectShouldShowBasicFunctionalityMigrationToast.resultFunc(
          'toast',
          false,
        ),
      ).toBe(true);
    });

    it('does not show a dismissed toast', () => {
      expect(
        selectShouldShowBasicFunctionalityMigrationToast.resultFunc(
          'toast',
          true,
        ),
      ).toBe(false);
    });
  });

  describe('selectIsSocialLoginBasicFunctionalityLocked', () => {
    it('locks Basic Functionality for a social-login user during rollout', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          true,
          AccountType.MetamaskGoogle,
          undefined,
          false,
        ),
      ).toBe(true);
    });

    it('keeps an off social-login toggle enabled for recovery', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          false,
          AccountType.MetamaskGoogle,
          undefined,
          false,
        ),
      ).toBe(false);
    });

    it('does not lock Basic Functionality for an SRP user', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          true,
          AccountType.Metamask,
          undefined,
          false,
        ),
      ).toBe(false);
    });
  });
});
