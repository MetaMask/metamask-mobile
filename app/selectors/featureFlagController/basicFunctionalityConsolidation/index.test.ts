import {
  BFT_CHILD_PREFERENCES,
  MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME,
  type BasicFunctionalityMigrationNotification,
  selectIsBasicFunctionalityConsistent,
  selectIsBasicFunctionalityConsolidationEnabled,
  selectIsBasicFunctionalitySocialLoginUser,
  selectIsExistingSocialWalletRestore,
  selectIsInBasicFunctionalityConsolidationRollout,
  selectIsSocialLoginBasicFunctionalityLocked,
  selectMobileUxBftcConsolidationFlagEnabled,
  selectShouldRepairSocialLoginBasicFunctionality,
  selectShouldShowBasicFunctionalityMigrationBottomSheet,
  selectShouldShowBasicFunctionalityMigrationToast,
} from './index';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';
import { AccountType } from '../../../constants/onboarding';
import { isBftcConsolidationBuildEnabled } from '../../../constants/featureFlags';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';

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
      );

      expect(result).toBe(false);
    });

    it('returns false when remote flag is missing', () => {
      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
      );

      expect(result).toBe(false);
    });

    it('falls back to the build flag when Basic Functionality is off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(true);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        false,
      );

      expect(result).toBe(true);
    });

    it('returns false when Basic Functionality and the build flag are both off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(false);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        false,
      );

      expect(result).toBe(false);
    });

    it('does not use the build flag for a Basic Functionality-on wallet', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(true);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
        true,
      );

      expect(result).toBe(false);
    });

    it('returns false for a Basic Functionality-on wallet when the remote flag is off', () => {
      jest.mocked(isBftcConsolidationBuildEnabled).mockReturnValue(false);

      const result = selectMobileUxBftcConsolidationFlagEnabled.resultFunc(
        {},
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

    it('keeps a persisted cohort consolidated when the enrollment flag is disabled', () => {
      const result = selectIsBasicFunctionalityConsolidationEnabled.resultFunc(
        false,
        true,
        true,
      );

      expect(result).toBe(true);
    });
  });

  describe('selectIsInBasicFunctionalityConsolidationRollout', () => {
    it('covers an enrolled wallet after the enrollment flag is disabled', () => {
      expect(
        selectIsInBasicFunctionalityConsolidationRollout.resultFunc(
          true,
          false,
        ),
      ).toBe(true);
    });

    it('covers an unmarked wallet the enrollment flag is about to migrate', () => {
      expect(
        selectIsInBasicFunctionalityConsolidationRollout.resultFunc(
          false,
          true,
        ),
      ).toBe(true);
    });

    it('excludes a wallet outside the rollout', () => {
      expect(
        selectIsInBasicFunctionalityConsolidationRollout.resultFunc(
          false,
          false,
        ),
      ).toBe(false);
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

  describe('selectIsExistingSocialWalletRestore', () => {
    it.each([
      AccountType.ImportedGoogle,
      AccountType.ImportedApple,
      AccountType.ImportedTelegram,
    ])('detects a restored social wallet for %s', (accountType) => {
      expect(selectIsExistingSocialWalletRestore.resultFunc(accountType)).toBe(
        true,
      );
    });

    it('excludes a newly created social wallet', () => {
      expect(
        selectIsExistingSocialWalletRestore.resultFunc(
          AccountType.MetamaskGoogle,
        ),
      ).toBe(false);
    });

    it('excludes an imported SRP wallet, which onboarding enrols itself', () => {
      expect(
        selectIsExistingSocialWalletRestore.resultFunc(AccountType.Imported),
      ).toBe(false);
    });

    it('returns false when no account type was recorded', () => {
      expect(selectIsExistingSocialWalletRestore.resultFunc(undefined)).toBe(
        false,
      );
    });
  });

  describe('selectIsBasicFunctionalitySocialLoginUser', () => {
    it.each([
      [
        'an onboarding account type',
        AccountType.MetamaskGoogle,
        undefined,
        false,
      ],
      [
        'a seedless auth connection',
        AccountType.Metamask,
        AuthConnection.Google,
        false,
      ],
      ['a seedless vault', AccountType.Metamask, undefined, true],
    ])(
      'detects a social wallet from %s',
      (_signal, accountType, authConnection, hasSeedlessVault) => {
        expect(
          selectIsBasicFunctionalitySocialLoginUser.resultFunc(
            accountType,
            authConnection,
            hasSeedlessVault,
            false,
          ),
        ).toBe(true);
      },
    );

    it('returns false for an SRP wallet', () => {
      expect(
        selectIsBasicFunctionalitySocialLoginUser.resultFunc(
          AccountType.Metamask,
          undefined,
          false,
          false,
        ),
      ).toBe(false);
    });

    it('detects a social wallet from a linked profile marker', () => {
      expect(
        selectIsBasicFunctionalitySocialLoginUser.resultFunc(
          AccountType.Imported,
          undefined,
          false,
          true,
        ),
      ).toBe(true);
    });
  });

  describe('selectIsSocialLoginBasicFunctionalityLocked', () => {
    it('locks Basic Functionality for a social-login user during rollout', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          true,
          true,
        ),
      ).toBe(true);
    });

    it('keeps an off social-login toggle enabled for recovery', () => {
      // The repair can fail and only re-runs on unlock, so locking the off
      // state would strand the wallet behind a greyed-out switch.
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          false,
          true,
        ),
      ).toBe(false);
    });

    it('does not lock Basic Functionality for an SRP user', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          true,
          true,
          false,
        ),
      ).toBe(false);
    });

    it('does not lock Basic Functionality outside the rollout', () => {
      expect(
        selectIsSocialLoginBasicFunctionalityLocked.resultFunc(
          false,
          true,
          true,
        ),
      ).toBe(false);
    });
  });

  describe('selectShouldRepairSocialLoginBasicFunctionality', () => {
    const shouldRepair = ({
      isConsolidated = true,
      isBasicFunctionalityEnabled = false,
      isSocialLoginUser = true,
      isLocallyKnownSocialLoginUser = false,
      hasLinkedSocialLoginProfile = false,
      migrationNotification = null,
      isMigrationNotificationDismissed = false,
    }: {
      isConsolidated?: boolean;
      isBasicFunctionalityEnabled?: boolean;
      isSocialLoginUser?: boolean;
      isLocallyKnownSocialLoginUser?: boolean;
      hasLinkedSocialLoginProfile?: boolean;
      migrationNotification?: BasicFunctionalityMigrationNotification;
      isMigrationNotificationDismissed?: boolean;
    }) =>
      selectShouldRepairSocialLoginBasicFunctionality.resultFunc(
        isConsolidated,
        isBasicFunctionalityEnabled,
        isSocialLoginUser,
        isLocallyKnownSocialLoginUser,
        hasLinkedSocialLoginProfile,
        migrationNotification,
        isMigrationNotificationDismissed,
      );

    it('repairs a consolidated social wallet left with Basic Functionality off', () => {
      expect(shouldRepair({ isLocallyKnownSocialLoginUser: true })).toBe(true);
    });

    it('does not repair a social wallet that is already on', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          isLocallyKnownSocialLoginUser: true,
        }),
      ).toBe(false);
    });

    it('does not repair an SRP wallet that chose to stay off', () => {
      expect(shouldRepair({ isSocialLoginUser: false })).toBe(false);
    });

    it('leaves an unconsolidated social wallet to the one-time migration', () => {
      expect(
        shouldRepair({
          isConsolidated: false,
          hasLinkedSocialLoginProfile: true,
        }),
      ).toBe(false);
    });

    it('repairs a consolidated linked-social wallet missing its notice', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          hasLinkedSocialLoginProfile: true,
        }),
      ).toBe(true);
    });

    it('does not repair a wallet already known to be social before sign-in', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          isLocallyKnownSocialLoginUser: true,
          hasLinkedSocialLoginProfile: true,
        }),
      ).toBe(false);
    });

    it('does not repair a linked-social wallet after notice dismissal', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          hasLinkedSocialLoginProfile: true,
          isMigrationNotificationDismissed: true,
        }),
      ).toBe(false);
    });

    it('does not repair a linked-social wallet with the social sheet already scheduled', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          hasLinkedSocialLoginProfile: true,
          migrationNotification: 'bottom-sheet',
        }),
      ).toBe(false);
    });

    it('repairs a linked-social wallet that migrated to the mixed toast', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          hasLinkedSocialLoginProfile: true,
          migrationNotification: 'toast',
        }),
      ).toBe(true);
    });

    it('does not repair a mixed toast on a wallet with no linked social profile', () => {
      expect(
        shouldRepair({
          isBasicFunctionalityEnabled: true,
          isSocialLoginUser: false,
          migrationNotification: 'toast',
        }),
      ).toBe(false);
    });
  });
});
