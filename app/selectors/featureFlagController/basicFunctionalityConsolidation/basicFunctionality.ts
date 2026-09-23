import { createSelector } from 'reselect';
import {
  selectBasicFunctionalityEnabled,
  selectHasLinkedSocialLoginProfile,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../settings';
import { RootState } from '../../../reducers';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectOnboardingAccountType } from '../../onboarding';
import { isImportedSocialAccountType } from '../../../constants/onboarding';
import { isBftcConsolidationBuildEnabled } from '../../../constants/featureFlags';
import {
  BFT_CHILD_PREFERENCES,
  isBasicFunctionalitySocialLoginUser,
  type BftChildPreference,
} from '../../../util/basicFunctionality/getBasicFunctionalityConsolidationPlan';

/**
 * Matches the LaunchDarkly flag key exactly. The remote key is misspelled
 * (`BftcOnsolidation`), and renaming it remotely would orphan the rollout, so
 * the client mirrors the remote spelling.
 */
export const MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME =
  'mobileUxBftcOnsolidation';

/**
 * Preference keys unified under consolidated Basic Functionality on mobile.
 *
 * Mobile-available Settings toggles only. Extension also consolidates phishing,
 * 4byte, proposed nicknames, ENS address-bar resolution, and currency-rate
 * check — those keys do not exist on mobile's PreferencesController.
 */
export { BFT_CHILD_PREFERENCES };
export type BasicFunctionalityMigrationNotification =
  | 'bottom-sheet'
  | 'toast'
  | null;

type BftChildPreferenceValues = Record<BftChildPreference, boolean>;

/**
 * Enrollment flag for consolidated Basic Functionality (version-gated).
 * Default OFF in production.
 *
 * Wallets with Basic Functionality off cannot read LaunchDarkly, so they use
 * the build flag. Wallets with Basic Functionality on use the remote flag,
 * including during mobile onboarding.
 */
export const selectMobileUxBftcConsolidationFlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  selectBasicFunctionalityEnabled,
  (remoteFeatureFlags, basicFunctionalityEnabled) => {
    if (!basicFunctionalityEnabled) {
      return isBftcConsolidationBuildEnabled();
    }

    const remoteFlag = remoteFeatureFlags?.[
      MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) === true;
  },
);

/**
 * True when this wallet arrived through social rehydration. That restore runs
 * inside onboarding but is never enrolled by it, so consolidation migrates it
 * as an existing wallet in the same session.
 */
export const selectIsExistingSocialWalletRestore = createSelector(
  selectOnboardingAccountType,
  isImportedSocialAccountType,
);

const selectPreferencesControllerState = (state: RootState) =>
  state.engine?.backgroundState?.PreferencesController as
    | Partial<Record<BftChildPreference, boolean>>
    | undefined;

const selectSeedlessAuthConnection = (state: RootState) =>
  state.engine?.backgroundState?.SeedlessOnboardingController?.authConnection;

const selectHasSeedlessVault = (state: RootState) =>
  state.engine?.backgroundState?.SeedlessOnboardingController?.vault != null;

/**
 * Reads BFT child prefs directly so partial test stores without
 * PreferencesController do not throw via preference selectors.
 * Returns null when PreferencesController is unavailable.
 */
const selectBftChildPreferenceValues = createSelector(
  selectPreferencesControllerState,
  (preferencesControllerState): BftChildPreferenceValues | null => {
    if (!preferencesControllerState) {
      return null;
    }

    return Object.fromEntries(
      BFT_CHILD_PREFERENCES.map((preference) => [
        preference,
        preferencesControllerState[preference] === true,
      ]),
    ) as BftChildPreferenceValues;
  },
);

/**
 * True when Basic Functionality and every child preference are aligned
 * all-on or all-off (silent legacy migration eligibility).
 */
export const selectIsBasicFunctionalityConsistent = createSelector(
  selectBasicFunctionalityEnabled,
  selectBftChildPreferenceValues,
  (basicFunctionalityEnabled, childPreferenceValues) => {
    if (!childPreferenceValues) {
      return false;
    }

    const areAllChildrenEnabled = BFT_CHILD_PREFERENCES.every(
      (preference) => childPreferenceValues[preference] === true,
    );
    const areAllChildrenDisabled = BFT_CHILD_PREFERENCES.every(
      (preference) => childPreferenceValues[preference] === false,
    );

    return (
      (basicFunctionalityEnabled && areAllChildrenEnabled) ||
      (!basicFunctionalityEnabled && areAllChildrenDisabled)
    );
  },
);

/**
 * True when the user should see consolidated Basic Functionality settings.
 *
 * The marker is one-way: once enrolled, a wallet remains consolidated even if
 * the rollout flag becomes unavailable or is disabled. The enrollment flag is
 * still required for unmarked, consistent legacy wallets.
 */
export const selectIsBasicFunctionalityConsolidationEnabled = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
  selectIsBasicFunctionalityConsistent,
  (isRemoteFlagEnabled, isPersistedConsolidatedUser, isConsistentLegacyUser) =>
    isPersistedConsolidatedUser ||
    (isRemoteFlagEnabled && isConsistentLegacyUser),
);

/**
 * True when Basic Functionality behaves as one consolidated control, covering
 * both enrolled wallets and wallets the enrollment flag is about to migrate.
 *
 * Broader than `selectIsBasicFunctionalityConsolidationEnabled`, which decides
 * what Settings renders: this also covers a mixed wallet whose background
 * migration has not finished, so a toggle it makes in the meantime still moves
 * every child preference. The persisted marker keeps it true after the
 * enrollment flag is disabled or becomes unreadable, otherwise an enrolled
 * wallet would leave hidden child preferences behind at their old values.
 */
export const selectIsInBasicFunctionalityConsolidationRollout = createSelector(
  selectIsBasicFunctionalityConsolidatedEnabled,
  selectMobileUxBftcConsolidationFlagEnabled,
  (isPersistedConsolidatedUser, isEnrollmentFlagEnabled) =>
    isPersistedConsolidatedUser || isEnrollmentFlagEnabled,
);

const selectBasicFunctionalityMigrationNotification = (state: RootState) =>
  (state.settings?.basicFunctionalityMigrationNotification ??
    null) as BasicFunctionalityMigrationNotification;

const selectIsBasicFunctionalityMigrationNotificationDismissed = (
  state: RootState,
) => Boolean(state.settings?.basicFunctionalityMigrationNotificationDismissed);

/**
 * A scheduled notice survives a feature-flag rollback. The migration may have
 * already changed the user's preferences, so acknowledging it must not depend
 * on the enrollment flag still being enabled.
 */
export const selectShouldShowBasicFunctionalityMigrationBottomSheet =
  createSelector(
    selectBasicFunctionalityMigrationNotification,
    selectIsBasicFunctionalityMigrationNotificationDismissed,
    (notification, isDismissed) =>
      notification === 'bottom-sheet' && !isDismissed,
  );

export const selectShouldShowBasicFunctionalityMigrationToast = createSelector(
  selectBasicFunctionalityMigrationNotification,
  selectIsBasicFunctionalityMigrationNotificationDismissed,
  (notification, isDismissed) => notification === 'toast' && !isDismissed,
);

/**
 * True when this wallet reached consolidation through a social login, from
 * either onboarding metadata or SeedlessOnboardingController state.
 */
export const selectIsBasicFunctionalitySocialLoginUser = createSelector(
  selectOnboardingAccountType,
  selectSeedlessAuthConnection,
  selectHasSeedlessVault,
  selectHasLinkedSocialLoginProfile,
  (
    accountType,
    authConnection,
    hasSeedlessVault,
    hasLinkedSocialLoginProfile,
  ) =>
    isBasicFunctionalitySocialLoginUser({
      accountType,
      authConnection,
      hasSeedlessVault,
      hasLinkedSocialLoginProfile,
    }),
);

/**
 * Social-login wallets in the consolidated cohort keep Basic Functionality on,
 * so the toggle is locked only while it is already on.
 *
 * An off social wallet keeps a usable switch. Consolidation repairs it, but
 * that repair writes no state if the service call rejects and only re-runs on
 * unlock, so locking the off state would leave the user with a greyed-out
 * switch and no way back from Settings.
 */
export const selectIsSocialLoginBasicFunctionalityLocked = createSelector(
  selectIsBasicFunctionalityConsolidationEnabled,
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalitySocialLoginUser,
  (isConsolidationEnabled, isBasicFunctionalityEnabled, isSocialLoginUser) =>
    isConsolidationEnabled && isBasicFunctionalityEnabled && isSocialLoginUser,
);

/**
 * True when an already-consolidated social-login wallet needs repair:
 * Basic Functionality is off, or a linked-social profile was detected after
 * migration and its one-time notice was never scheduled.
 */
export const selectShouldRepairSocialLoginBasicFunctionality = createSelector(
  selectIsBasicFunctionalityConsolidatedEnabled,
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalitySocialLoginUser,
  selectHasLinkedSocialLoginProfile,
  selectBasicFunctionalityMigrationNotification,
  selectIsBasicFunctionalityMigrationNotificationDismissed,
  (
    isPersistedConsolidated,
    isBasicFunctionalityEnabled,
    isSocialLoginUser,
    hasLinkedSocialLoginProfile,
    migrationNotification,
    isMigrationNotificationDismissed,
  ) =>
    isPersistedConsolidated &&
    ((!isBasicFunctionalityEnabled && isSocialLoginUser) ||
      (hasLinkedSocialLoginProfile === true &&
        !isMigrationNotificationDismissed &&
        migrationNotification === null)),
);
