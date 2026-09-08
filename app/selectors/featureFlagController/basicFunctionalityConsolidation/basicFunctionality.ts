import { createSelector } from 'reselect';
import {
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../settings';
import { RootState } from '../../../reducers';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectOnboardingAccountType } from '../../onboarding';
import {
  BFT_CHILD_PREFERENCES,
  isBasicFunctionalitySocialLoginUser,
  type BftChildPreference,
} from '../../../util/basicFunctionality/getBasicFunctionalityConsolidationPlan';

export const MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME =
  'mobileUxBftcConsolidation';

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
 * Remote rollout flag for consolidated Basic Functionality (version-gated).
 * Default OFF in production; acts as kill-switch when disabled.
 */
export const selectMobileUxBftcConsolidationFlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.[
      MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
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
 * The remote flag controls rollout. Persisted cohort users and legacy users
 * with a consistent all-on or all-off configuration are eligible.
 */
export const selectIsBasicFunctionalityConsolidationEnabled = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
  selectIsBasicFunctionalityConsistent,
  (isRemoteFlagEnabled, isPersistedConsolidatedUser, isConsistentLegacyUser) =>
    isRemoteFlagEnabled &&
    (isPersistedConsolidatedUser || isConsistentLegacyUser),
);

const selectBasicFunctionalityMigrationNotification = (state: RootState) =>
  (state.settings?.basicFunctionalityMigrationNotification ??
    null) as BasicFunctionalityMigrationNotification;

const selectIsBasicFunctionalityMigrationNotificationDismissed = (
  state: RootState,
) => Boolean(state.settings?.basicFunctionalityMigrationNotificationDismissed);

export const selectShouldShowBasicFunctionalityMigrationBottomSheet =
  createSelector(
    selectMobileUxBftcConsolidationFlagEnabled,
    selectBasicFunctionalityMigrationNotification,
    selectIsBasicFunctionalityMigrationNotificationDismissed,
    (isFlagEnabled, notification, isDismissed) =>
      isFlagEnabled && notification === 'bottom-sheet' && !isDismissed,
  );

export const selectShouldShowBasicFunctionalityMigrationToast = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectBasicFunctionalityMigrationNotification,
  selectIsBasicFunctionalityMigrationNotificationDismissed,
  (isFlagEnabled, notification, isDismissed) =>
    isFlagEnabled && notification === 'toast' && !isDismissed,
);

export const selectIsSocialLoginBasicFunctionalityLocked = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectOnboardingAccountType,
  selectSeedlessAuthConnection,
  selectHasSeedlessVault,
  (isFlagEnabled, accountType, authConnection, hasSeedlessVault) =>
    isFlagEnabled &&
    isBasicFunctionalitySocialLoginUser({
      accountType,
      authConnection,
      hasSeedlessVault,
    }),
);
