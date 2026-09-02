import { createSelector } from 'reselect';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from '../../seedlessOnboardingController';
import { selectBasicFunctionalityEnabled } from '../../settings';
import {
  selectDisplayNftMedia,
  selectIsMultiAccountBalancesEnabled,
  selectIsSecurityAlertsEnabled,
  selectUseNftDetection,
  selectUseSafeChainsListValidation,
  selectUseTokenDetection,
  selectUseTransactionSimulations,
} from '../../preferencesController';
import { BFT_CHILD_PREFERENCES } from '../../../util/basicFunctionality/bftChildPreferences';

/**
 * True when the user authenticated via social / seedless onboarding.
 * Social users cannot turn Basic Functionality off once consolidated.
 */
export const selectIsBasicFunctionalitySocialLoginUser = createSelector(
  selectSeedlessOnboardingLoginFlow,
  selectSeedlessOnboardingAuthConnection,
  (isSeedlessLoginFlow, authConnection) =>
    Boolean(isSeedlessLoginFlow || authConnection),
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
 * Legacy users whose BF toggle already matches every child preference.
 * Used so consolidation UI can apply before/without a persisted cohort marker.
 */
export const selectIsBasicFunctionalityConsistent = createSelector(
  selectBasicFunctionalityEnabled,
  selectBftChildPreferenceValues,
  (basicFunctionalityEnabled, childPreferenceValues) => {
    const enabledChildren = BFT_CHILD_PREFERENCES.filter(
      (preference) => childPreferenceValues[preference] === true,
    ).length;
    const areAllChildrenEnabled =
      enabledChildren === BFT_CHILD_PREFERENCES.length;
    const areAllChildrenDisabled = enabledChildren === 0;

    return (
      (basicFunctionalityEnabled && areAllChildrenEnabled) ||
      (!basicFunctionalityEnabled && areAllChildrenDisabled)
    );
  },
);
