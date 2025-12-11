import { RootState } from '../../reducers';
import { selectIsPna25FlagEnabled } from '../featureFlagController/legalNotices';
import { MetaMetrics } from '../../core/Analytics';
import { newPrivacyPolicyDate } from '../../reducers/legalNotices';
import { selectCompletedOnboarding } from '../onboarding';

const currentDate = new Date(Date.now());

export const shouldShowNewPrivacyToastSelector = (
  state: RootState,
): boolean => {
  const {
    newPrivacyPolicyToastShownDate,
    newPrivacyPolicyToastClickedOrClosed,
  } = state.legalNotices;

  if (newPrivacyPolicyToastClickedOrClosed) return false;

  const shownDate = new Date(newPrivacyPolicyToastShownDate || 0);

  const oneDayInMilliseconds = 24 * 60 * 60 * 1000;
  const isRecent =
    currentDate.getTime() - shownDate.getTime() < oneDayInMilliseconds;

  return (
    currentDate.getTime() >= newPrivacyPolicyDate.getTime() &&
    (!newPrivacyPolicyToastShownDate ||
      (isRecent && !newPrivacyPolicyToastClickedOrClosed))
  );
};

/**
 * Selector for PNA25 acknowledgement
 *
 * @param state - Redux state
 * @returns Boolean indicating whether or not the user has acknowledged PNA25
 */
export const selectIsPna25Acknowledged = (state: RootState): boolean =>
  state.legalNotices.isPna25Acknowledged;

/**
 * Determines if the PNA25 notice should be shown based on:
 * - User has completed onboarding (completedOnboarding === true)
 * - LaunchDarkly feature flag (extension-ux-pna25) is enabled (boolean)
 * - User is an existing user (pna25Acknowledged !== true)
 * - User has opted into metrics (participateInMetaMetrics === true)
 * New users will have pna25Acknowledged = true (PNA25 was shown during onboarding)
 * Existing users will have pna25Acknowledged = false (PNA25 didn't exist when they onboarded)
 *
 * @param state - Redux state
 * @returns Boolean indicating whether or not to show the PNA25 notice
 */
export const selectShouldShowPna25Notice = (state: RootState): boolean => {
  const completedOnboarding = selectCompletedOnboarding(state);
  const isPna25Acknowledged = selectIsPna25Acknowledged(state);
  const isPna25Enabled = selectIsPna25FlagEnabled(state);

  if (!completedOnboarding || !isPna25Enabled || isPna25Acknowledged) {
    return false;
  }

  const areMetametricsEnabled = MetaMetrics.getInstance().isEnabled();

  if (areMetametricsEnabled === false) {
    return false;
  }

  return true;
};
