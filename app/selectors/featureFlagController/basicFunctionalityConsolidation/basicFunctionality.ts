import { createSelector } from 'reselect';
import {
  selectBasicFunctionalityEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
} from '../../settings';
import {
  selectDisplayNftMedia,
  selectIsMultiAccountBalancesEnabled,
  selectIsSecurityAlertsEnabled,
  selectUseNftDetection,
  selectUseSafeChainsListValidation,
  selectUseTokenDetection,
  selectUseTransactionSimulations,
} from '../../preferencesController';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME =
  'mobileUxBftcConsolidation';

/**
 * Preference keys unified under consolidated Basic Functionality on mobile.
 *
 * Mobile-available Settings toggles only. Extension also consolidates phishing,
 * 4byte, proposed nicknames, ENS address-bar resolution, and currency-rate
 * check — those keys do not exist on mobile's PreferencesController.
 */
export const BFT_CHILD_PREFERENCES = [
  'useTransactionSimulations',
  'securityAlertsEnabled',
  'isMultiAccountBalancesEnabled',
  'useSafeChainsListValidation',
  'useTokenDetection',
  'displayNftMedia',
  'useNftDetection',
] as const;

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

const selectBftChildPreferenceValues = createSelector(
  selectUseTransactionSimulations,
  selectIsSecurityAlertsEnabled,
  selectIsMultiAccountBalancesEnabled,
  selectUseSafeChainsListValidation,
  selectUseTokenDetection,
  selectDisplayNftMedia,
  selectUseNftDetection,
  (
    useTransactionSimulations,
    securityAlertsEnabled,
    isMultiAccountBalancesEnabled,
    useSafeChainsListValidation,
    useTokenDetection,
    displayNftMedia,
    useNftDetection,
  ) => ({
    useTransactionSimulations,
    securityAlertsEnabled,
    isMultiAccountBalancesEnabled,
    useSafeChainsListValidation,
    useTokenDetection,
    displayNftMedia,
    useNftDetection,
  }),
);

/**
 * True when Basic Functionality and every child preference are aligned
 * all-on or all-off (silent legacy migration eligibility).
 */
export const selectIsBasicFunctionalityConsistent = createSelector(
  selectBasicFunctionalityEnabled,
  selectBftChildPreferenceValues,
  (basicFunctionalityEnabled, childPreferenceValues) => {
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
